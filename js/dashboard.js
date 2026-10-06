import { startAnonymousAuth } from "./auth.js";


const uidElement = document.getElementById("user-uid");
const statusElement = document.getElementById("auth-status");


startAnonymousAuth((user) => {

    console.log("LIFE DASHBOARD 起動");

    console.log("User UID:", user.uid);


    // UIDを画面に表示
    uidElement.textContent = user.uid;


    // ONLINE表示
    statusElement.textContent = "ONLINE";

});
