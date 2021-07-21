/* Joins */

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


SELECT * FROM "user";
SELECT * FROM "purchase";


/* users AND their purchases */
SELECT *
FROM "user"
LEFT OUTER JOIN
      "purchase"
ON
      "user"."id" = "purchase"."userId";


/* users AND their purchases even if they have none */
SELECT *
FROM "user"
INNER JOIN
      "purchase"
ON
      "user"."id" = "purchase"."userId";

/* only users who have purchases */
SELECT DISTINCT
       "user".*
FROM "user"
INNER JOIN
      "purchase"
ON
      "user"."id" = "purchase"."userId";

/* only users who do not have purchases */
SELECT
       "user".*
FROM "user"
LEFT OUTER JOIN
      "purchase"
ON
      "user"."id" = "purchase"."userId"
WHERE
      "purchase"."id" IS NULL;
