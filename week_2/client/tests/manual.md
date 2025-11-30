# Frontend manual checks

Prereq: backend running (`npm run server --prefix week_2`) and frontend served (`npm run client --prefix week_2`).

1) Room lifecycle
- Visit http://localhost:5173 and click **New**. Ensure URL contains `?session=`.
- Copy link, open new tab, paste link, click **Join**. Both tabs should show each other in Participants.

2) Realtime editing
- Type in editor on tab A; text appears instantly on tab B. Edit back and forth.

3) Language switching
- Toggle between JavaScript, Python, Java and confirm syntax highlighting updates in both tabs.

4) Execution
- With JavaScript selected, run `console.log("hi")`; output appears in panel.
- With Python selected, run `print("hi")`; output appears.
- Java should show the “execution disabled” message.

5) Disconnect handling
- Close tab B; tab A should remove participant badge shortly after.
