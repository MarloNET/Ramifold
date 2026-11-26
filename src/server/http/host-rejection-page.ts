// Rejection page MSG-014 for every Host other than 127.0.0.1 and localhost (TechSpec 2.2, CC-09):
// plain page without Ramifold layout, without scripts, stylesheets or data. Wording from the UI/UX Design.

export function hostRejectionPage(): string {
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Address not allowed</title>\n</head>\n' +
    "<body>\n<p>This address is not allowed. Open the address shown in the terminal.</p>\n</body>\n</html>\n"
  );
}
