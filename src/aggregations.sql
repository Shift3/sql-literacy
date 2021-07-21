/* Aggregation */

/* Database setup */
DELETE FROM "purchase";
DELETE FROM "user";

INSERT INTO "user"
       ("firstName", "lastName", "age")
VALUES
       ('With', 'Purchases', 25),
       ('Without', 'Purchases', 14);

INSERT INTO "purchase"
       ("amount", "name", "userId")
SELECT
       35.00, 'Purchase 1', u.id
FROM "user" u WHERE "firstName" = 'With';

INSERT INTO "purchase"
       ("amount", "name", "userId")
SELECT
       5.45, 'Purchase 2', u.id
FROM "user" u WHERE "firstName" = 'With';
/* End Database setup */

/* count purchases for each user, CAUTION: does not scale, if you had
a massive dataset you would want a view/trigger approach */
SELECT
        "user".*,
        COUNT("purchase"."id") AS purchase_count
FROM "user"
LEFT JOIN "purchase" ON "purchase"."userId" = "user"."id"
GROUP BY "user"."id";

/* sum users total purchase amount, same comment as above applies */
SELECT
        "user".*,
        COALESCE(SUM("purchase"."amount"), 0.00) AS total
FROM "user"
LEFT JOIN "purchase" ON "purchase"."userId" = "user"."id"
GROUP BY "user"."id";


/* BONUS materialized view teaser */

DROP MATERIALIZED VIEW IF EXISTS user_purchase_count_view;
CREATE MATERIALIZED VIEW user_purchase_count_view AS
SELECT
        "user".*,
        COUNT("purchase"."id") AS purchase_count
FROM "user"
LEFT JOIN "purchase" ON "purchase"."userId" = "user"."id"
GROUP BY "user"."id";

SELECT * FROM user_purchase_count_view;

-- NOTE(justin): Note that after we insert more users into the table,
-- the materialized view hasn't picked them up yet. This is because
-- materialized views are cached and you must refresh them when you
-- want the query the view is based on to be re-run.

INSERT INTO "user"
       ("firstName", "lastName", "age")
VALUES
       ('More', 'Users', 1),
       ('Even', 'More', 81);

SELECT * FROM user_purchase_count_view;

REFRESH MATERIALIZED VIEW user_purchase_count_view;
SELECT * FROM user_purchase_count_view;
