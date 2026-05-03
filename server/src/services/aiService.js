async function scoreCondition() {
  const error = new Error("Condition image scoring is not enabled");
  error.statusCode = 503;
  throw error;
}

module.exports = { scoreCondition };
