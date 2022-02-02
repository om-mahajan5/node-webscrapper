const sqlite3 = require('sqlite3').verbose();

// open the database
let db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the TEST database.');
});

db.serialize(() => {
    db.each(`CREATE TABLE questions (
      question_id INTEGER,
      question TEXT,
      votes INTEGER,
      answers INTEGER,
      references_ INTEGER,
      UNIQUE(question_id)
      );`
        , (err, row) => {
            if (err) {
                console.error(err.message);
            }
            // console.log(row.id + "\t" + row.name);
        },
        (err, count) => {
            console.log("TABLE CREATED");
        }
    );
});


db.serialize(() => {
    db.each(`INSERT INTO questions VALUES (
        1,
        "Hi",
        5,
        6,
        16
    )
    `, (err, row) => {
        if (err) {
            console.error(err.message);
        }
        // console.log(row.id + "\t" + row.name);
    });
});

db.serialize(() => {
    // db.each(`SELECT * FROM questions WHERE EXISTS (SELECT 1 FROM questions WHERE question_id=2)`,
    db.each(`SELECT * FROM questions WHERE EXISTS (SELECT 1 FROM questions WHERE question_id=2)`,
        (err, row) => {
            if (err) {
                console.error(err.message);
            }
            console.log("DATA", row);
        },
        (err, count) => {
            if (err) {
                console.error(err.message);
            }
            console.log(count);
        });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Close the database connection.');
});