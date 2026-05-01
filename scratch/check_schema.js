const { db } = require('./db');
async function check() {
  const res = await db.all('DESCRIBE vendors');
  console.log(res);
  process.exit(0);
}
check();
