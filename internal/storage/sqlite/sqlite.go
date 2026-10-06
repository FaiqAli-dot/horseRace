package sqlite

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/domain"
	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) DB() *sql.DB { return s.db }

func (s *Store) migrate() error {
	schema := `
CREATE TABLE IF NOT EXISTS horses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  number INTEGER NOT NULL,
  color TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS races (
  id TEXT PRIMARY KEY,
  race_number INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  betting_open_at TEXT NOT NULL,
  betting_close_at TEXT NOT NULL,
  race_start_at TEXT NOT NULL,
  result_at TEXT,
  settled_at TEXT,
  takeout_rate REAL NOT NULL,
  config_version TEXT NOT NULL,
  result_seed INTEGER,
  result_json TEXT
);
CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE,
  player_id TEXT NOT NULL,
  race_id TEXT NOT NULL,
  horse_id TEXT NOT NULL,
  market TEXT NOT NULL,
  stake_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  potential_dividend REAL NOT NULL DEFAULT 0,
  final_dividend REAL NOT NULL DEFAULT 0,
  payout_cents INTEGER NOT NULL DEFAULT 0,
  settlement_status TEXT NOT NULL,
  is_mock INTEGER NOT NULL DEFAULT 0,
  rgs_txn_id TEXT,
  FOREIGN KEY(race_id) REFERENCES races(id)
);
CREATE TABLE IF NOT EXISTS wallet_balances (
  player_id TEXT PRIMARY KEY,
  balance_cents INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  race_id TEXT,
  bet_id TEXT,
  player_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pool_snapshots (
  race_id TEXT NOT NULL,
  market TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(race_id, market)
);
CREATE INDEX IF NOT EXISTS idx_bets_race ON bets(race_id);
CREATE INDEX IF NOT EXISTS idx_bets_player ON bets(player_id);
CREATE INDEX IF NOT EXISTS idx_races_status ON races(status);
`
	_, err := s.db.Exec(schema)
	if err != nil {
		return err
	}
	for _, h := range domain.Horses {
		_, _ = s.db.Exec(`INSERT OR IGNORE INTO horses(id,name,number,color) VALUES(?,?,?,?)`,
			h.ID, h.Name, h.Number, h.Color)
	}
	return nil
}

func fmtTime(t time.Time) string { return t.UTC().Format(time.RFC3339Nano) }

func parseTime(s string) (time.Time, error) {
	return time.Parse(time.RFC3339Nano, s)
}

func parseTimePtr(s sql.NullString) (*time.Time, error) {
	if !s.Valid || s.String == "" {
		return nil, nil
	}
	t, err := parseTime(s.String)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *Store) UpsertRace(r domain.Race) error {
	var resultJSON, resultAt, settledAt sql.NullString
	var seed sql.NullInt64
	if r.Result != nil {
		b, _ := json.Marshal(r.Result)
		resultJSON = sql.NullString{String: string(b), Valid: true}
	}
	if r.ResultAt != nil {
		resultAt = sql.NullString{String: fmtTime(*r.ResultAt), Valid: true}
	}
	if r.SettledAt != nil {
		settledAt = sql.NullString{String: fmtTime(*r.SettledAt), Valid: true}
	}
	if r.ResultSeed != nil {
		seed = sql.NullInt64{Int64: *r.ResultSeed, Valid: true}
	}
	_, err := s.db.Exec(`
INSERT INTO races(id,race_number,status,scheduled_at,betting_open_at,betting_close_at,race_start_at,result_at,settled_at,takeout_rate,config_version,result_seed,result_json)
VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(id) DO UPDATE SET
 status=excluded.status,
 result_at=excluded.result_at,
 settled_at=excluded.settled_at,
 result_seed=excluded.result_seed,
 result_json=excluded.result_json
`, r.ID, r.RaceNumber, string(r.Status), fmtTime(r.ScheduledAt), fmtTime(r.BettingOpenAt),
		fmtTime(r.BettingCloseAt), fmtTime(r.RaceStartAt), resultAt, settledAt, r.TakeoutRate,
		r.ConfigVersion, seed, resultJSON)
	return err
}

func scanRace(row interface {
	Scan(dest ...any) error
}) (domain.Race, error) {
	var r domain.Race
	var status string
	var scheduled, openAt, closeAt, startAt string
	var resultAt, settledAt, resultJSON sql.NullString
	var seed sql.NullInt64
	err := row.Scan(&r.ID, &r.RaceNumber, &status, &scheduled, &openAt, &closeAt, &startAt,
		&resultAt, &settledAt, &r.TakeoutRate, &r.ConfigVersion, &seed, &resultJSON)
	if err != nil {
		return r, err
	}
	r.Status = domain.RaceStatus(status)
	r.Horses = domain.Horses
	if r.ScheduledAt, err = parseTime(scheduled); err != nil {
		return r, err
	}
	if r.BettingOpenAt, err = parseTime(openAt); err != nil {
		return r, err
	}
	if r.BettingCloseAt, err = parseTime(closeAt); err != nil {
		return r, err
	}
	if r.RaceStartAt, err = parseTime(startAt); err != nil {
		return r, err
	}
	if r.ResultAt, err = parseTimePtr(resultAt); err != nil {
		return r, err
	}
	if r.SettledAt, err = parseTimePtr(settledAt); err != nil {
		return r, err
	}
	if seed.Valid {
		v := seed.Int64
		r.ResultSeed = &v
	}
	if resultJSON.Valid && resultJSON.String != "" {
		var res domain.RaceResult
		if err := json.Unmarshal([]byte(resultJSON.String), &res); err != nil {
			return r, err
		}
		r.Result = &res
	}
	return r, nil
}

func (s *Store) GetRace(id string) (domain.Race, error) {
	row := s.db.QueryRow(`SELECT id,race_number,status,scheduled_at,betting_open_at,betting_close_at,race_start_at,result_at,settled_at,takeout_rate,config_version,result_seed,result_json FROM races WHERE id=?`, id)
	return scanRace(row)
}

func (s *Store) ListRaces(limit int) ([]domain.Race, error) {
	rows, err := s.db.Query(`SELECT id,race_number,status,scheduled_at,betting_open_at,betting_close_at,race_start_at,result_at,settled_at,takeout_rate,config_version,result_seed,result_json FROM races ORDER BY race_number DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Race
	for rows.Next() {
		r, err := scanRace(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) ListRacesByStatus(statuses ...domain.RaceStatus) ([]domain.Race, error) {
	if len(statuses) == 0 {
		return nil, nil
	}
	args := make([]any, len(statuses))
	ph := make([]string, len(statuses))
	for i, st := range statuses {
		args[i] = string(st)
		ph[i] = "?"
	}
	q := fmt.Sprintf(`SELECT id,race_number,status,scheduled_at,betting_open_at,betting_close_at,race_start_at,result_at,settled_at,takeout_rate,config_version,result_seed,result_json FROM races WHERE status IN (%s) ORDER BY race_number ASC`, strings.Join(ph, ","))
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Race
	for rows.Next() {
		r, err := scanRace(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) NextRaceNumber() (int64, error) {
	var n sql.NullInt64
	err := s.db.QueryRow(`SELECT MAX(race_number) FROM races`).Scan(&n)
	if err != nil {
		return 0, err
	}
	if !n.Valid {
		return 1, nil
	}
	return n.Int64 + 1, nil
}

func (s *Store) InsertBet(b domain.Bet) error {
	var idem sql.NullString
	if b.IdempotencyKey != "" {
		idem = sql.NullString{String: b.IdempotencyKey, Valid: true}
	}
	mock := 0
	if b.IsMock {
		mock = 1
	}
	_, err := s.db.Exec(`INSERT INTO bets(id,idempotency_key,player_id,race_id,horse_id,market,stake_cents,created_at,status,potential_dividend,final_dividend,payout_cents,settlement_status,is_mock,rgs_txn_id)
VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		b.ID, idem, b.PlayerID, b.RaceID, b.HorseID, string(b.Market), b.StakeC, fmtTime(b.CreatedAt),
		string(b.Status), b.PotentialDividendAtPlace, b.FinalDividend, b.PayoutC, string(b.SettlementStatus), mock, b.RGSTxnID)
	return err
}

func (s *Store) UpdateBetSettlement(b domain.Bet) error {
	_, err := s.db.Exec(`UPDATE bets SET status=?, final_dividend=?, payout_cents=?, settlement_status=? WHERE id=?`,
		string(b.Status), b.FinalDividend, b.PayoutC, string(b.SettlementStatus), b.ID)
	return err
}

func (s *Store) GetBet(id string) (domain.Bet, error) {
	row := s.db.QueryRow(`SELECT id,idempotency_key,player_id,race_id,horse_id,market,stake_cents,created_at,status,potential_dividend,final_dividend,payout_cents,settlement_status,is_mock,rgs_txn_id FROM bets WHERE id=?`, id)
	return scanBet(row)
}

func (s *Store) GetBetByIdempotency(key string) (domain.Bet, error) {
	row := s.db.QueryRow(`SELECT id,idempotency_key,player_id,race_id,horse_id,market,stake_cents,created_at,status,potential_dividend,final_dividend,payout_cents,settlement_status,is_mock,rgs_txn_id FROM bets WHERE idempotency_key=?`, key)
	return scanBet(row)
}

func scanBet(row interface {
	Scan(dest ...any) error
}) (domain.Bet, error) {
	var b domain.Bet
	var market, status, settle, created string
	var idem sql.NullString
	var mock int
	err := row.Scan(&b.ID, &idem, &b.PlayerID, &b.RaceID, &b.HorseID, &market, &b.StakeC, &created,
		&status, &b.PotentialDividendAtPlace, &b.FinalDividend, &b.PayoutC, &settle, &mock, &b.RGSTxnID)
	if err != nil {
		return b, err
	}
	if idem.Valid {
		b.IdempotencyKey = idem.String
	}
	b.Market = domain.Market(market)
	b.Status = domain.BetStatus(status)
	b.SettlementStatus = domain.SettlementStatus(settle)
	b.IsMock = mock == 1
	b.CreatedAt, err = parseTime(created)
	return b, err
}

func (s *Store) ListBetsByRace(raceID string) ([]domain.Bet, error) {
	rows, err := s.db.Query(`SELECT id,idempotency_key,player_id,race_id,horse_id,market,stake_cents,created_at,status,potential_dividend,final_dividend,payout_cents,settlement_status,is_mock,rgs_txn_id FROM bets WHERE race_id=? ORDER BY created_at ASC`, raceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Bet
	for rows.Next() {
		b, err := scanBet(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *Store) ListBetsByPlayer(playerID string, limit int) ([]domain.Bet, error) {
	rows, err := s.db.Query(`SELECT id,idempotency_key,player_id,race_id,horse_id,market,stake_cents,created_at,status,potential_dividend,final_dividend,payout_cents,settlement_status,is_mock,rgs_txn_id FROM bets WHERE player_id=? AND is_mock=0 ORDER BY created_at DESC LIMIT ?`, playerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Bet
	for rows.Next() {
		b, err := scanBet(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *Store) EnsureWallet(playerID string, startingC int64) error {
	_, err := s.db.Exec(`INSERT OR IGNORE INTO wallet_balances(player_id, balance_cents) VALUES(?,?)`, playerID, startingC)
	return err
}

func (s *Store) GetBalance(playerID string) (int64, error) {
	var bal int64
	err := s.db.QueryRow(`SELECT balance_cents FROM wallet_balances WHERE player_id=?`, playerID).Scan(&bal)
	return bal, err
}

func (s *Store) SetBalance(playerID string, bal int64) error {
	_, err := s.db.Exec(`UPDATE wallet_balances SET balance_cents=? WHERE player_id=?`, bal, playerID)
	return err
}

func (s *Store) InsertWalletTxn(t domain.WalletTxn) error {
	_, err := s.db.Exec(`INSERT INTO wallet_transactions(id,player_id,type,amount_cents,balance_after_cents,ref_type,ref_id,created_at) VALUES(?,?,?,?,?,?,?,?)`,
		t.ID, t.PlayerID, t.Type, t.AmountC, t.BalanceC, t.RefType, t.RefID, fmtTime(t.CreatedAt))
	return err
}

func (s *Store) Debit(playerID string, amountC int64, refType, refID string) (int64, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()
	var bal int64
	if err := tx.QueryRow(`SELECT balance_cents FROM wallet_balances WHERE player_id=?`, playerID).Scan(&bal); err != nil {
		return 0, err
	}
	if bal < amountC {
		return 0, fmt.Errorf("insufficient funds")
	}
	bal -= amountC
	if _, err := tx.Exec(`UPDATE wallet_balances SET balance_cents=? WHERE player_id=?`, bal, playerID); err != nil {
		return 0, err
	}
	wt := domain.WalletTxn{
		ID: "wtx-" + refID, PlayerID: playerID, Type: "debit", AmountC: amountC,
		BalanceC: bal, RefType: refType, RefID: refID, CreatedAt: time.Now().UTC(),
	}
	if _, err := tx.Exec(`INSERT INTO wallet_transactions(id,player_id,type,amount_cents,balance_after_cents,ref_type,ref_id,created_at) VALUES(?,?,?,?,?,?,?,?)`,
		wt.ID, wt.PlayerID, wt.Type, wt.AmountC, wt.BalanceC, wt.RefType, wt.RefID, fmtTime(wt.CreatedAt)); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return bal, nil
}

func (s *Store) Credit(playerID string, amountC int64, refType, refID string) (int64, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()
	var bal int64
	if err := tx.QueryRow(`SELECT balance_cents FROM wallet_balances WHERE player_id=?`, playerID).Scan(&bal); err != nil {
		return 0, err
	}
	bal += amountC
	if _, err := tx.Exec(`UPDATE wallet_balances SET balance_cents=? WHERE player_id=?`, bal, playerID); err != nil {
		return 0, err
	}
	id := "wtx-" + refID + "-c"
	if _, err := tx.Exec(`INSERT INTO wallet_transactions(id,player_id,type,amount_cents,balance_after_cents,ref_type,ref_id,created_at) VALUES(?,?,?,?,?,?,?,?)`,
		id, playerID, "credit", amountC, bal, refType, refID, fmtTime(time.Now().UTC())); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return bal, nil
}

func (s *Store) SavePoolSnapshot(raceID string, mp domain.MarketPool) error {
	b, err := json.Marshal(mp)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`INSERT INTO pool_snapshots(race_id,market,snapshot_json,created_at) VALUES(?,?,?,?)
ON CONFLICT(race_id,market) DO UPDATE SET snapshot_json=excluded.snapshot_json, created_at=excluded.created_at`,
		raceID, string(mp.Market), string(b), fmtTime(time.Now().UTC()))
	return err
}

func (s *Store) InsertAudit(ev domain.AuditEvent) error {
	_, err := s.db.Exec(`INSERT INTO audit_events(id,type,race_id,bet_id,player_id,detail,created_at) VALUES(?,?,?,?,?,?,?)`,
		ev.ID, ev.Type, ev.RaceID, ev.BetID, ev.PlayerID, ev.Detail, fmtTime(ev.CreatedAt))
	return err
}

func (s *Store) ResetDemo(playerID string, startingC int64) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	for _, q := range []string{
		`DELETE FROM bets`,
		`DELETE FROM races`,
		`DELETE FROM pool_snapshots`,
		`DELETE FROM wallet_transactions`,
		`DELETE FROM audit_events`,
	} {
		if _, err := tx.Exec(q); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(`UPDATE wallet_balances SET balance_cents=? WHERE player_id=?`, startingC, playerID); err != nil {
		return err
	}
	return tx.Commit()
}
