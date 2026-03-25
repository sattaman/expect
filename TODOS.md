Rasmus:

- Unauthenticated case.
- Out of usage case
- Dont fucking build packages so that we need to build in order to update and go to defintiion goes to fucking d.ts. files.
-- After launch
- cleanup rrweb PR
- cleanup browser / mcp code (pretty leaky, lifetimes not handled, interrupts not handled, etc)
  - needs to be much more testable, eg. should be trivial to have a testing script which goes to google.com, writes in some shit, and then we get the video and live viewer artifact and should be able to view it locally (without server n shit)
