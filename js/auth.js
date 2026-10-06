import {
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { auth } from "./firebase.js";


export function startAnonymousAuth(callback) {

    // Firebaseの認証状態を監視
    onAuthStateChanged(auth, (user) => {

        if (user) {

            console.log("Firebase認証成功");
            console.log("UID:", user.uid);

            callback(user);

        }

    });


    // 匿名ログイン
    signInAnonymously(auth)
        .catch((error) => {

            console.error("匿名ログインに失敗しました");

            console.error(error);

        });

}
