-- Custom SQL migration file, put your code below! --
CREATE TRIGGER `credit_account_counters_non_negative_insert`
BEFORE INSERT ON `credit_account`
WHEN NEW.`total_granted` < 0
  OR NEW.`total_consumed` < 0
  OR NEW.`total_expired` < 0
  OR NEW.`total_revoked` < 0
BEGIN
  SELECT RAISE(ABORT, 'credit account counters must be non-negative');
END;
--> statement-breakpoint
CREATE TRIGGER `credit_account_counters_non_negative_update`
BEFORE UPDATE OF `total_granted`, `total_consumed`, `total_expired`, `total_revoked` ON `credit_account`
WHEN NEW.`total_granted` < 0
  OR NEW.`total_consumed` < 0
  OR NEW.`total_expired` < 0
  OR NEW.`total_revoked` < 0
BEGIN
  SELECT RAISE(ABORT, 'credit account counters must be non-negative');
END;
--> statement-breakpoint
CREATE TRIGGER `credit_transaction_remaining_non_negative_insert`
BEFORE INSERT ON `credit_transaction`
WHEN NEW.`remaining_amount` < 0
BEGIN
  SELECT RAISE(ABORT, 'credit transaction remaining amount must be non-negative');
END;
--> statement-breakpoint
CREATE TRIGGER `credit_transaction_remaining_non_negative_update`
BEFORE UPDATE OF `remaining_amount` ON `credit_transaction`
WHEN NEW.`remaining_amount` < 0
BEGIN
  SELECT RAISE(ABORT, 'credit transaction remaining amount must be non-negative');
END;
