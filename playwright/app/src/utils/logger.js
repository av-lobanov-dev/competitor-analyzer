function getTime() {
  return new Date().toISOString();
}

function info(message) {
  console.log(`[INFO] ${getTime()} ${message}`);
}

function error(message, err) {
  console.error(`[ERROR] ${getTime()} ${message}`);

  if (err) {
    console.error(err);
  }
}

module.exports = {
  info,
  error,
};
