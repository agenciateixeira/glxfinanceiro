-- Atualizar a view recent_transactions para incluir tags
DROP VIEW IF EXISTS recent_transactions CASCADE;

CREATE VIEW recent_transactions AS
SELECT 
  t.id,
  t.user_id,
  t.date,
  t.description,
  t.amount,
  t.type,
  t.status,
  t.payment_method,
  t.notes,
  t.created_at,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  COALESCE(
    json_agg(
      json_build_object(
        'id', tags.id,
        'name', tags.name,
        'color', tags.color
      )
    ) FILTER (WHERE tags.id IS NOT NULL),
    '[]'::json
  ) as tags
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
LEFT JOIN tags ON tt.tag_id = tags.id
GROUP BY t.id, t.user_id, t.date, t.description, t.amount, t.type, t.status, 
         t.payment_method, t.notes, t.created_at, c.id, c.name, c.color, c.icon;
