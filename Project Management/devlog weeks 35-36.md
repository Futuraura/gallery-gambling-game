# Gallery Gambling - Project report weeks 35-36

Currently, I am the sole member of the team, which means I am responsible for all development, project management, and related tasks. While this comes with its challenges, I see it as a positive opportunity: I can keep the workflow simple, avoid unnecessary coordination overhead, and fully shape the project based on my own vision and implementation. I know I am putting in my best effort and pushing myself to achieve as much as possible with this project, and I am proud of the progress I’ve made so far.

## Frontend

Two versions of the frontend have been developed so far. The second version added a dedicated error screen for handling unexpected issues in the future. Currently, the frontend includes seven different “scenes”: Error, Background, Loading, Main Menu, Painting, Auction, and End Screen. The Painting screen’s toolset and painting functionality itself is still unfinished, I plan to continue working on it after I’ve finalized the overall backend–frontend architecture.
Here are some of the screens:

![Error Screen](https://files.itsmark.dev/pdf-images/project-report-35-36/error_screen.png)
_Fig. 1 Error Screen_

---

![Main Menu](https://files.itsmark.dev/pdf-images/project-report-35-36/mainmenu.png)
_Fig. 2 Main Menu_

---

![Painting Screen](https://files.itsmark.dev/pdf-images/project-report-35-36/painting.png)
_Fig. 3 Painting Screen_

---

![Auction Screen](https://files.itsmark.dev/pdf-images/project-report-35-36/auction.png)
_Fig. 4 Auction Screen_

---

![The Loan Screen](https://files.itsmark.dev/pdf-images/project-report-35-36/thebank.png)
_Fig. 5 The Loan Screen_

---

![The End Screen](https://files.itsmark.dev/pdf-images/project-report-35-36/endscreen.png)
_Fig. 6 The End Screen_

## Backend

On the backend, I am learning to work with Node.js and Socket.io. I have already managed to exchange data between the client and the server and will next focus on building a simple game-joining logic. While the game system seems straightforward in theory, the backend adds complexity: managing sockets, maintaining player classes, and ensuring all clients receive the correct updates at the right time.

## Challenges

The main challenge has been working with new technologies such as Node.js and Socket.io, since I have no prior experience with them. Another difficulty is staying consistent with progress at times due to motivation and time management. Still, I am proud to be managing the entire project independently — from frontend design to backend architecture and server deployment. Handling all areas myself has been demanding, but it also gives me the chance to grow quickly and gain experience across the full development stack.

## Next steps

- Finalize the frontend by the end of this week, including a responsive layout for different devices and completing the toolset and canvas functionality.
- By the end of next week, deliver a backend prototype with basic player and game management features.
- Begin testing the integration between frontend and backend once both parts have their initial versions ready.
