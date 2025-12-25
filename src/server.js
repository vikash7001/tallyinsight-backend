const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`TallyInsight API running on port ${port}`);
});
