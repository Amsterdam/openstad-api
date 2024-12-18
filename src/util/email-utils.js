const whitelistedEmails = process.env.WHITELISTED_EMAILS 
  ? process.env.WHITELISTED_EMAILS.split('\n').slice(0, -1) 
  : [];

function isWhitelistedEmail(from) {
  return whitelistedEmails.some(whitelistedEmail => from.includes(whitelistedEmail));
}

module.exports = {
  isWhitelistedEmail
};
