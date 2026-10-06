import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { auth, db } from "./firebase.js";


// ============================================================
// DOM
// ============================================================

const authStatusElement =
    document.getElementById("auth-status");

const calendarTitleElement =
    document.getElementById("calendar-title");

const calendarGridElement =
    document.getElementById("calendar-grid");

const selectedDateTitleElement =
    document.getElementById("selected-date-title");

const scheduleListElement =
    document.getElementById("schedule-list");

const scheduleDateInput =
    document.getElementById("schedule-date");

const scheduleTimeInput =
    document.getElementById("schedule-time");

const scheduleTitleInput =
    document.getElementById("schedule-title");

const addScheduleButton =
    document.getElementById("add-schedule-button");

const prevMonthButton =
    document.getElementById("prev-month");

const todayMonthButton =
    document.getElementById("today-month");

const nextMonthButton =
    document.getElementById("next-month");


// ============================================================
// State
// ============================================================

let currentUser = null;

let schedules = [];

let currentMonth = new Date();

let selectedDate =
    getDateKey(new Date());


// ============================================================
// Utility
// ============================================================

function padNumber(number) {

    return String(number).padStart(2, "0");

}


function getDateKey(date) {

    const year =
        date.getFullYear();

    const month =
        padNumber(
            date.getMonth() + 1
        );

    const day =
        padNumber(
            date.getDate()
        );

    return `${year}-${month}-${day}`;

}


function formatJapaneseDate(dateKey) {

    const [
        year,
        month,
        day
    ] =
        dateKey
            .split("-")
            .map(Number);


    const date =
        new Date(
            year,
            month - 1,
            day
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


    return (
        `${year}年` +
        `${month}月` +
        `${day}日` +
        `（${weekdays[date.getDay()]}）`
    );

}


// ============================================================
// Firebase Authentication
// ============================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            currentUser = null;

            authStatusElement.textContent =
                "Authentication required";

            return;

        }


        currentUser =
            user;


        authStatusElement.textContent =
            "● Online";


        console.log(
            "Schedule Firebase認証成功"
        );

        console.log(
            "UID:",
            currentUser.uid
        );


        await loadSchedules();

    }
);


// ============================================================
// Firestoreから予定を取得
// ============================================================

async function loadSchedules() {

    if (!currentUser) {
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


        const snapshot =
            await getDocs(
                schedulesRef
            );


        schedules = [];


        snapshot.forEach(
            (scheduleDoc) => {

                const data =
                    scheduleDoc.data();


                schedules.push({

                    id:
                        scheduleDoc.id,

                    date:
                        data.date || "",

                    time:
                        data.time || "",

                    title:
                        data.title || "",

                    completed:
                        data.completed === true

                });

            }
        );


        sortSchedules();


        renderCalendar();

        renderSelectedDate();


    } catch (error) {

        console.error(
            "予定取得失敗:",
            error
        );


        scheduleListElement.innerHTML =
            `<div class="no-schedule">
                予定を読み込めませんでした。
            </div>`;

    }

}


// ============================================================
// 予定を並び替え
// ============================================================

function sortSchedules() {

    schedules.sort(
        (a, b) => {

            if (
                a.date !==
                b.date
            ) {

                return a.date.localeCompare(
                    b.date
                );

            }


            return a.time.localeCompare(
                b.time
            );

        }
    );

}


// ============================================================
// カレンダー描画
// ============================================================

function renderCalendar() {

    const year =
        currentMonth.getFullYear();

    const month =
        currentMonth.getMonth();


    calendarTitleElement.textContent =
        `${year}年 ${month + 1}月`;


    calendarGridElement.innerHTML =
        "";


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    const startDate =
        new Date(
            year,
            month,
            1
        );


    startDate.setDate(
        1 - firstDay.getDay()
    );


    const todayKey =
        getDateKey(
            new Date()
        );


    for (
        let i = 0;
        i < 42;
        i++
    ) {

        const date =
            new Date(
                startDate
            );


        date.setDate(
            startDate.getDate() + i
        );


        const dateKey =
            getDateKey(date);


        const dayElement =
            document.createElement(
                "div"
            );


        dayElement.className =
            "calendar-day";


        if (
            date.getMonth() !==
            month
        ) {

            dayElement.classList.add(
                "other-month"
            );

        }


        if (
            dateKey ===
            todayKey
        ) {

            dayElement.classList.add(
                "today"
            );

        }


        if (
            dateKey ===
            selectedDate
        ) {

            dayElement.classList.add(
                "selected"
            );

        }


        const dayNumberElement =
            document.createElement(
                "div"
            );


        dayNumberElement.className =
            "day-number";


        dayNumberElement.textContent =
            date.getDate();


        dayElement.appendChild(
            dayNumberElement
        );


        // ====================================================
        // この日に予定があるか
        // ====================================================

        const daySchedules =
            schedules.filter(
                (schedule) =>
                    schedule.date ===
                    dateKey
            );


        if (
            daySchedules.length > 0
        ) {

            const dotElement =
                document.createElement(
                    "div"
                );


            dotElement.className =
                "schedule-dot";


            // 未完了予定がない場合は薄くする
            const hasIncomplete =
                daySchedules.some(
                    (schedule) =>
                        schedule.completed !== true
                );


            if (!hasIncomplete) {

                dotElement.style.opacity =
                    "0.35";

            }


            dayElement.appendChild(
                dotElement
            );

        }


        // ====================================================
        // 日付クリック
        // ====================================================

        dayElement.addEventListener(
            "click",
            () => {

                selectedDate =
                    dateKey;


                scheduleDateInput.value =
                    selectedDate;


                renderCalendar();

                renderSelectedDate();

            }
        );


        calendarGridElement.appendChild(
            dayElement
        );

    }

}


// ============================================================
// 選択日の予定表示
// ============================================================

function renderSelectedDate() {

    selectedDateTitleElement.textContent =
        formatJapaneseDate(
            selectedDate
        );


    scheduleListElement.innerHTML =
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
                    a.time.localeCompare(
                        b.time
                    )
            );


    if (
        selectedSchedules.length === 0
    ) {

        const emptyElement =
            document.createElement(
                "div"
            );


        emptyElement.className =
            "no-schedule";


        emptyElement.textContent =
            "この日の予定はありません。";


        scheduleListElement.appendChild(
            emptyElement
        );


        return;

    }


    selectedSchedules.forEach(
        (schedule) => {

            const itemElement =
                document.createElement(
                    "div"
                );


            itemElement.className =
                "schedule-item";


            if (
                schedule.completed === true
            ) {

                itemElement.classList.add(
                    "completed"
                );

            }


            // ==================================================
            // 時刻
            // ==================================================

            const timeElement =
                document.createElement(
                    "div"
                );


            timeElement.className =
                "schedule-time";


            timeElement.textContent =
                schedule.time;


            // ==================================================
            // 内容
            // ==================================================

            const contentElement =
                document.createElement(
                    "div"
                );


            contentElement.className =
                "schedule-content";


            const titleElement =
                document.createElement(
                    "div"
                );


            titleElement.className =
                "schedule-title";


            titleElement.textContent =
                schedule.title;


            contentElement.appendChild(
                titleElement
            );


            // ==================================================
            // 操作
            // ==================================================

            const actionsElement =
                document.createElement(
                    "div"
                );


            actionsElement.className =
                "schedule-actions";


            // ==================================================
            // 完了
            // ==================================================

            const completeButton =
                document.createElement(
                    "button"
                );


            completeButton.className =
                "complete-button";


            if (
                schedule.completed === true
            ) {

                completeButton.textContent =
                    "✓ 完了";

                completeButton.classList.add(
                    "completed"
                );

            } else {

                completeButton.textContent =
                    "完了";

            }


            completeButton.addEventListener(
                "click",
                () => {

                    toggleScheduleComplete(
                        schedule
                    );

                }
            );


            // ==================================================
            // 編集
            // ==================================================

            const editButton =
                document.createElement(
                    "button"
                );


            editButton.className =
                "edit-button";


            editButton.textContent =
                "編集";


            editButton.addEventListener(
                "click",
                () => {

                    editSchedule(
                        schedule
                    );

                }
            );


            // ==================================================
            // 削除
            // ==================================================

            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.className =
                "delete-button";


            deleteButton.textContent =
                "削除";


            deleteButton.addEventListener(
                "click",
                () => {

                    deleteSchedule(
                        schedule
                    );

                }
            );


            actionsElement.appendChild(
                completeButton
            );

            actionsElement.appendChild(
                editButton
            );

            actionsElement.appendChild(
                deleteButton
            );


            itemElement.appendChild(
                timeElement
            );

            itemElement.appendChild(
                contentElement
            );

            itemElement.appendChild(
                actionsElement
            );


            scheduleListElement.appendChild(
                itemElement
            );

        }
    );

}


// ============================================================
// 予定追加
// ============================================================

addScheduleButton.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            alert(
                "Firebase認証が完了していません。"
            );

            return;

        }


        const date =
            scheduleDateInput.value.trim();

        const time =
            scheduleTimeInput.value.trim();

        const title =
            scheduleTitleInput.value.trim();


        if (!date) {

            alert(
                "日付を入力してください。"
            );

            return;

        }


        if (!time) {

            alert(
                "時刻を入力してください。"
            );

            return;

        }


        if (!title) {

            alert(
                "予定名を入力してください。"
            );

            return;

        }


        if (
            !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(
                time
            )
        ) {

            alert(
                "時刻は HH:MM 形式で入力してください。"
            );

            return;

        }


        try {

            addScheduleButton.disabled =
                true;


            addScheduleButton.textContent =
                "追加中...";


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
                        title,

                    completed:
                        false

                }
            );


            scheduleTitleInput.value =
                "";

            scheduleTimeInput.value =
                "";


            selectedDate =
                date;


            const [
                year,
                month
            ] =
                date
                    .split("-")
                    .map(Number);


            currentMonth =
                new Date(
                    year,
                    month - 1,
                    1
                );


            await loadSchedules();


        } catch (error) {

            console.error(
                "予定追加失敗:",
                error
            );


            alert(
                "予定を追加できませんでした。"
            );

        } finally {

            addScheduleButton.disabled =
                false;


            addScheduleButton.textContent =
                "予定を追加";

        }

    }
);


// ============================================================
// 完了 / 未完了
// ============================================================

async function toggleScheduleComplete(
    schedule
) {

    if (!currentUser) {
        return;
    }


    const newCompleted =
        schedule.completed !== true;


    try {

        await updateDoc(

            doc(
                db,
                "users",
                currentUser.uid,
                "schedules",
                schedule.id
            ),

            {
                completed:
                    newCompleted
            }

        );


        schedule.completed =
            newCompleted;


        renderCalendar();

        renderSelectedDate();


    } catch (error) {

        console.error(
            "予定完了状態変更失敗:",
            error
        );


        alert(
            "予定の完了状態を変更できませんでした。"
        );

    }

}


// ============================================================
// 編集
// ============================================================

async function editSchedule(
    schedule
) {

    if (!currentUser) {
        return;
    }


    const newTitle =
        prompt(
            "予定名を入力してください。",
            schedule.title
        );


    if (
        newTitle === null
    ) {
        return;
    }


    const trimmedTitle =
        newTitle.trim();


    if (!trimmedTitle) {

        alert(
            "予定名を入力してください。"
        );

        return;

    }


    const newTime =
        prompt(
            "時刻を入力してください。\n例：20:00",
            schedule.time
        );


    if (
        newTime === null
    ) {
        return;
    }


    const trimmedTime =
        newTime.trim();


    if (
        !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(
            trimmedTime
        )
    ) {

        alert(
            "時刻は HH:MM 形式で入力してください。"
        );

        return;

    }


    const newDate =
        prompt(
            "日付を入力してください。\n例：2026-10-06",
            schedule.date
        );


    if (
        newDate === null
    ) {
        return;
    }


    const trimmedDate =
        newDate.trim();


    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            trimmedDate
        )
    ) {

        alert(
            "日付は YYYY-MM-DD 形式で入力してください。"
        );

        return;

    }


    try {

        await updateDoc(

            doc(
                db,
                "users",
                currentUser.uid,
                "schedules",
                schedule.id
            ),

            {

                title:
                    trimmedTitle,

                time:
                    trimmedTime,

                date:
                    trimmedDate

            }

        );


        schedule.title =
            trimmedTitle;

        schedule.time =
            trimmedTime;

        schedule.date =
            trimmedDate;


        selectedDate =
            trimmedDate;


        const [
            year,
            month
        ] =
            trimmedDate
                .split("-")
                .map(Number);


        currentMonth =
            new Date(
                year,
                month - 1,
                1
            );


        sortSchedules();

        renderCalendar();

        renderSelectedDate();


        scheduleDateInput.value =
            selectedDate;


    } catch (error) {

        console.error(
            "予定編集失敗:",
            error
        );


        alert(
            "予定を編集できませんでした。"
        );

    }

}


// ============================================================
// 削除
// ============================================================

async function deleteSchedule(
    schedule
) {

    if (!currentUser) {
        return;
    }


    const confirmed =
        confirm(
            `「${schedule.title}」を削除しますか？`
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
                schedule.id
            )

        );


        schedules =
            schedules.filter(
                (item) =>
                    item.id !==
                    schedule.id
            );


        renderCalendar();

        renderSelectedDate();


    } catch (error) {

        console.error(
            "予定削除失敗:",
            error
        );


        alert(
            "予定を削除できませんでした。"
        );

    }

}


// ============================================================
// 月移動
// ============================================================

prevMonthButton.addEventListener(
    "click",
    () => {

        currentMonth.setMonth(
            currentMonth.getMonth() - 1
        );


        renderCalendar();

    }
);


nextMonthButton.addEventListener(
    "click",
    () => {

        currentMonth.setMonth(
            currentMonth.getMonth() + 1
        );


        renderCalendar();

    }
);


// ============================================================
// 今日
// ============================================================

todayMonthButton.addEventListener(
    "click",
    () => {

        const today =
            new Date();


        currentMonth =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );


        selectedDate =
            getDateKey(
                today
            );


        scheduleDateInput.value =
            selectedDate;


        renderCalendar();

        renderSelectedDate();

    }
);


// ============================================================
// 初期状態
// ============================================================

scheduleDateInput.value =
    selectedDate;


renderCalendar();

renderSelectedDate();
