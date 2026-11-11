-- Transactional Outbox Pattern & CDC Schema
-- Guarantees at-least-once delivery of business events to Kafka without dual-write race conditions.

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Index for Debezium CDC polling (or PostgreSQL logical decoding plugin)
CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed 
ON outbox_events (created_at) 
WHERE processed_at IS NULL;

-- Example: Atomic business write and event generation inside single transaction
-- BEGIN;
-- INSERT INTO orders (order_id, user_id, amount, status) 
-- VALUES ('ord_1029', 'usr_492', 199.99, 'PENDING');
--
-- INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
-- VALUES (
--     'Order', 
--     'ord_1029', 
--     'OrderCreated', 
--     jsonb_build_object('order_id', 'ord_1029', 'user_id', 'usr_492', 'amount', 199.99, 'timestamp', CURRENT_TIMESTAMP)
-- );
-- COMMIT;

