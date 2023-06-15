# doublezero

An open source alternative to client-side prediction and server reconciliation. 

## Basics

Alright let's start with the basics. You might be asking yourself, *what the heck is client-side prediction?* or *scratch's head*, server reconcilliation?

Well they are just buzz terms for essentially syncing client and server state. Let's call it CSPSR. Many modern multiplayer games are built off of a similar premise. This isn't something that is super new or novel. Just a new open source solution that might help you in your next project.

## But Why?

Well, I'll be honest, the best apps that I have ever used have been instantly responsive. No spinners, instant writes, instant navigation and best of all available even when I don't have a connection to the internet. 

But that is just it, this is a solution for **apps**. I'm not talking your next hype beast sneaker e-commerce store. I'm talking dashboards and productivity apps. So this isnt a one size fits all solution, just another option.

## Architecture

### Client 

My initial thoughts as of right now is that we can use mobx to handle all of the data. As I work more and more will applications in the frontend I am starting to realize how nice it is to separate your data layer from your presentation layer. I find often times in the world of frontend frameworks that the data is very closely tied to the presentation layer. While this is good from a DX perspective, I have found that it leads to more complexity in understanding the model of the application. 

MobX provides us with the capability to easily separate the data layer through a series of reactive primitives. Components can observe specific pieces of data and re-render in order to keep the presentation up-to-date. Components can also call a series of user defined actions in order to update the data in the MobX stores.

In order to have full offline support for our users we need a client-side data store that is capable of persisting data from MobX. That means we need to reach for something like indexeddb. Which is a browser storage mechanism that can support large collections of structured data. You can think of it like a database for the frontend. 

However, this comes with its own set of complexity when it comes to data residency and synchronization. Is MobX or IndexedDB the source of truth for the data? My initial thoughts as of right now is that MobX is the source of truth and is also going to be responsible for updating IndexedDB with the new data whenever a user performs an action to update the store. We can do that my making use of MobX reactions to react to changes in the data and persist them in IndexedDB.


We also need a way to subscribe to a stream of data from the server which tells us when another user has updated a specific state. You can imagine a situation where two users are modifying the same document. One user may make a change to update the document and we want the second user to see that change instantly. There fore we need a way for the server to communicate those changes to the client. We can do that by allowing the MobX store to call a streaming endpoint on the backend to ensure that the data in the store is always up-to-date with what the server has. Ultimately the server is the final source of truth for the data. We just want to the client to be able to hold its own without the need for the server.

Finally, we need a way to communicate the set up changes in the store to the server. We can do that by creating a JSON patch for each update to the store and persisting it in the store. That way when it comes time to sync with the server, we can send it a series of patches that it can then reconcile to determine what the current state of the world is from the backend perspective
