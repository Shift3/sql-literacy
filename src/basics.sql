/* Basics */

\d user

SELECT * FROM "user";

INSERT INTO "user"
       ("firstName", "lastName", "age")
VALUES
       ('Ham', 'Burger', 2);

SELECT * FROM "user";

UPDATE "user"
SET
        "firstName" = 'Aged Cheese',
        "age"       = 10
WHERE
        "firstName" = 'Ham';

SELECT * FROM "user";

DELETE FROM "user"
WHERE
        "firstName" = 'Aged Cheese';

SELECT * FROM "user";
