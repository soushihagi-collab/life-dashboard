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
   DOM ELEMENTS
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

const calendarGrid =
    document.getElementById(
        "calendar-grid"
    );

const calendarMonth =
    document.getElementById(
        "calendar-month"
    );

const selectedDateHeading =
    document.getElementById(
        "selected-date-heading"
    );

const previousMonthButton =
    document.getElementById(
        "previous-month"
    );

const nextMonthButton =
    document.getElementById(
        "next-month"
    );


/* =========================
   STATE
========================= */

let currentUser = null;

let schedules = [];

let currentCalendarDate =
    new Date();

let selectedDate =
    getToday();


/* =========================
   DATE FUNCTIONS
========================= */

function getToday() {

    const now =
        new Date();

    return formatDate(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
}


function formatDate(
    year,
    month,
    date
) {

    const monthText =
        String(
            month + 1
        ).padStart(
            2,
            "0"
        );

    const dateText =
        String(
            date
        ).padStart(
            2,
            "0"
        );

    return `${year}-${monthText}-${dateText}`;
}


function formatJapaneseDate(
    dateKey
) {

    const [
        year,
        month,
        date
    ] =
        dateKey
            .split("-")
            .map(
                Number
            );


    const dateObject =
        new Date(
            year,
            month - 1,
            date
        );


    const weekdays = [
        "日",
        "月",
        "火",
        "水",
        "木",
        "金",
        "土"
    ];


    return `${year}年${month}月${date}日（${weekdays[dateObject.getDay()]}）`;
}


/* =========================
   LOAD SCHEDULES
========================= */

async function loadSchedules() {

    if (!currentUser) {
        return;
    }


    try {

        listElement.innerHTML =
            `<div class="empty-message">
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


        schedules =
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


        renderCalendar();

        renderSelectedDate();


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
   RENDER CALENDAR
========================= */

function renderCalendar() {

    calendarGrid.innerHTML =
        "";


    const year =
        currentCalendarDate.getFullYear();

    const month =
        currentCalendarDate.getMonth();


    calendarMonth.textContent =
        `${year}年${month + 1}月`;


    /*
     * 月初の曜日
     */

    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    /*
     * 月の日数
     */

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    /*
     * 前月の日数
     */

    const daysInPreviousMonth =
        new Date(
            year,
            month,
            0
        ).getDate();


    /*
     * 前月の日付
     */

    for (
        let i = firstDay - 1;
        i >= 0;
        i--
    ) {

        const date =
            daysInPreviousMonth - i;


        const dayElement =
            createCalendarDay(
                year,
                month - 1,
                date,
                true
            );


        calendarGrid.appendChild(
            dayElement
        );
    }


    /*
     * 今月の日付
     */

    for (
        let date = 1;
        date <= daysInMonth;
        date++
    ) {

        const dayElement =
            createCalendarDay(
                year,
                month,
                date,
                false
            );


        calendarGrid.appendChild(
            dayElement
        );
    }


    /*
     * 次月の日付
     *
     * カレンダーを6週間分にする
     */

    const totalCells =
        calendarGrid.children.length;


    const remainingCells =
        42 - totalCells;


    for (
        let date = 1;
        date <= remainingCells;
        date++
    ) {

        const dayElement =
            createCalendarDay(
                year,
                month + 1,
                date,
                true
            );


        calendarGrid.appendChild(
            dayElement
        );
    }

}


/* =========================
   CREATE CALENDAR DAY
========================= */

function createCalendarDay(
    year,
    month,
    date,
    isOtherMonth
) {

    const dateKey =
        formatDate(
            year,
            month,
            date
        );


    const dayElement =
        document.createElement(
            "button"
        );


    dayElement.type =
        "button";


    dayElement.className =
        "calendar-day";


    if (
        isOtherMonth
    ) {

        dayElement.classList.add(
            "other-month"
        );
    }


    /*
     * 今日
     */

    if (
        dateKey === getToday()
    ) {

        dayElement.classList.add(
            "today"
        );
    }


    /*
     * 選択中
     */

    if (
        dateKey === selectedDate
    ) {

        dayElement.classList.add(
            "selected"
        );
    }


    /*
     * 日付番号
     */

    const numberElement =
        document.createElement(
            "div"
        );


    numberElement.className =
        "calendar-day-number";


    numberElement.textContent =
        date;


    dayElement.appendChild(
        numberElement
    );


    /*
     * 予定の有無
     */

    const hasSchedule =
        schedules.some(
            (schedule) =>
                schedule.date ===
                dateKey
        );


    if (
        hasSchedule
    ) {

        const dotElement =
            document.createElement(
                "span"
            );


        dotElement.className =
            "calendar-event-dot";


        dayElement.appendChild(
            dotElement
        );
    }


    /*
     * クリック
     */

    dayElement.addEventListener(
        "click",
        () => {

            selectedDate =
                dateKey;


            /*
             * 別月の日付をクリックした場合、
             * その月へ移動
             */

            currentCalendarDate =
                new Date(
                    year,
                    month,
                    1
                );


            renderCalendar();

            renderSelectedDate();


            /*
             * 追加フォームの日付も変更
             */

            dateInput.value =
                selectedDate;

        }
    );


    return dayElement;
}


/* =========================
   RENDER SELECTED DATE
========================= */

function renderSelectedDate() {

    selectedDateHeading.textContent =
        formatJapaneseDate(
            selectedDate
        );


    listElement.innerHTML =
        "";


    const selectedSchedules =
        schedules
            .filter(
                (schedule) =>
                    schedule.date ===
                    selectedDate
            )
            .sort(
                (a, b) =>
                    String(
                        a.time || ""
                    ).localeCompare(
                        String(
                            b.time || ""
                        )
                    )
            );


    if (
        selectedSchedules.length === 0
    ) {

        listElement.innerHTML =
            `<div class="empty-message">
                この日の予定はありません。
            </div>`;


        return;
    }


    selectedSchedules.forEach(
        (schedule) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "schedule-item";


            const left =
                document.createElement(
                    "div"
                );


            left.className =
                "schedule-item-left";


            const time =
                document.createElement(
                    "div"
                );


            time.className =
                "schedule-time";


            time.textContent =
                schedule.time || "";


            const title =
                document.createElement(
                    "div"
                );


            title.className =
                "schedule-title";


            title.textContent =
                schedule.title || "";


            left.appendChild(
                time
            );


            left.appendChild(
                title
            );


            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.type =
                "button";


            deleteButton.className =
                "delete-button";


            deleteButton.textContent =
                "削除";


            deleteButton.addEventListener(
                "click",
                async () => {

                    await deleteSchedule(
                        schedule.id
                    );

                }
            );


            item.appendChild(
                left
            );


            item.appendChild(
                deleteButton
            );


            listElement.appendChild(
                item
            );

        }
    );

}


/* =========================
   ADD SCHEDULE
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


            /*
             * フォームをリセット
             */

            titleInput.value =
                "";


            /*
             * 登録した日付を選択
             */

            selectedDate =
                date;


            const [
                year,
                month
            ] =
                date
                    .split("-")
                    .map(
                        Number
                    );


            currentCalendarDate =
                new Date(
                    year,
                    month - 1,
                    1
                );


            /*
             * 再読み込み
             */

            await loadSchedules();


            dateInput.value =
                selectedDate;


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
   DELETE SCHEDULE
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
   MONTH NAVIGATION
========================= */

previousMonthButton.addEventListener(
    "click",
    () => {

        currentCalendarDate =
            new Date(
                currentCalendarDate.getFullYear(),
                currentCalendarDate.getMonth() - 1,
                1
            );


        renderCalendar();

    }
);


nextMonthButton.addEventListener(
    "click",
    () => {

        currentCalendarDate =
            new Date(
                currentCalendarDate.getFullYear(),
                currentCalendarDate.getMonth() + 1,
                1
            );


        renderCalendar();

    }
);


/* =========================
   INITIAL DATE
========================= */

dateInput.value =
    selectedDate;


/* =========================
   FIREBASE AUTH
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
