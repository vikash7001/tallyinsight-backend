const app = require("./app");

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`TallyInsight API running on port ${PORT}`);
});
