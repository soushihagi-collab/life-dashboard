import { startAnonymousAuth } from "./auth.js";


import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


import { db } from "./firebase.js";



/* =========================
   ELEMENTS
========================= */

const form =
    document.getElementById(
        "schedule-form"
    );


const dateInput =
    document.getElementById(
        "schedule-date"
    );


const timeInput =
    document.getElementById(
        "schedule-time"
    );


const titleInput =
    document.getElementById(
        "schedule-title"
    );


const listElement =
    document.getElementById(
        "schedule-list"
    );


const statusElement =
    document.getElementById(
        "auth-status"
    );



/* =========================
   CURRENT USER
========================= */

let currentUser = null;



/* =========================
   TODAY
========================= */

function getToday() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const date =
        String(
            now.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${date}`;

}



dateInput.value =
    getToday();



/* =========================
   LOAD SCHEDULES
========================= */

async function loadSchedules() {

    if (!currentUser) {

        return;

    }


    try {

        listElement.innerHTML =
            `<div class="loading-message">
                読み込み中...
            </div>`;


        const schedulesRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "schedules"
            );


        const snapshot =
            await getDocs(
                schedulesRef
            );


        const schedules =
            snapshot.docs.map(
                (item) => ({

                    id:
                        item.id,

                    ...item.data()

                })
            );


        schedules.sort(
            (a, b) => {

                const dateA =
                    `${a.date || ""} ${a.time || ""}`;

                const dateB =
                    `${b.date || ""} ${b.time || ""}`;

                return dateA.localeCompare(
                    dateB
                );

            }
        );


        renderSchedules(
            schedules
        );


    } catch (error) {

        console.error(
            "予定取得失敗:",
            error
        );


        listElement.innerHTML =
            `<div class="empty-message">
                予定の取得に失敗しました。
            </div>`;

    }

}



/* =========================
   RENDER
========================= */

function renderSchedules(
    schedules
) {

    listElement.innerHTML = "";


    if (
        schedules.length === 0
    ) {

        listElement.innerHTML =
            `<div class="empty-message">
                予定はありません。
            </div>`;

        return;

    }


    schedules.forEach(
        (schedule) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "schedule-item";


            item.innerHTML = `

                <div
                    class="schedule-item-left"
                >

                    <div
                        class="schedule-time"
                    >
                        ${escapeHTML(
                            schedule.time || ""
                        )}
                    </div>


                    <div>

                        <div
                            class="schedule-title"
                        >
                            ${escapeHTML(
                                schedule.title || ""
                            )}
                        </div>


                        <div
                            style="
                                margin-top:5px;
                                font-size:10px;
                                color:#697482;
                            "
                        >
                            ${escapeHTML(
                                schedule.date || ""
                            )}
                        </div>

                    </div>

                </div>


                <button
                    class="delete-button"
                    data-id="${schedule.id}"
                >
                    削除
                </button>

            `;


            const deleteButton =
                item.querySelector(
                    ".delete-button"
                );


            deleteButton.addEventListener(
                "click",
                async () => {

                    await deleteSchedule(
                        schedule.id
                    );

                }
            );


            listElement.appendChild(
                item
            );

        }
    );

}



/* =========================
   ADD
========================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUser) {

            alert(
                "Firebaseへの接続が完了していません。"
            );

            return;

        }


        const date =
            dateInput.value;


        const time =
            timeInput.value;


        const title =
            titleInput.value.trim();


        if (
            !date ||
            !time ||
            !title
        ) {

            return;

        }


        try {

            const schedulesRef =
                collection(
                    db,
                    "users",
                    currentUser.uid,
                    "schedules"
                );


            await addDoc(
                schedulesRef,
                {

                    date:
                        date,

                    time:
                        time,

                    title:
                        title

                }
            );


            titleInput.value =
                "";


            await loadSchedules();


        } catch (error) {

            console.error(
                "予定追加失敗:",
                error
            );


            alert(
                "予定の追加に失敗しました。"
            );

        }

    }
);



/* =========================
   DELETE
========================= */

async function deleteSchedule(
    scheduleId
) {

    const confirmed =
        confirm(
            "この予定を削除しますか？"
        );


    if (!confirmed) {

        return;

    }


    try {

        await deleteDoc(

            doc(
                db,
                "users",
                currentUser.uid,
                "schedules",
                scheduleId
            )

        );


        await loadSchedules();


    } catch (error) {

        console.error(
            "予定削除失敗:",
            error
        );


        alert(
            "予定の削除に失敗しました。"
        );

    }

}



/* =========================
   HTML ESCAPE
========================= */

function escapeHTML(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}



/* =========================
   AUTH
========================= */

startAnonymousAuth(
    async (user) => {

        currentUser =
            user;


        statusElement.textContent =
            "ONLINE";


        console.log(
            "Schedule 起動"
        );


        console.log(
            "User UID:",
            user.uid
        );


        await loadSchedules();

    }
);
