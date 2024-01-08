document.addEventListener("DOMContentLoaded", function() {
    //ENDPOINTS
    let subjectsEndpoint = "https://radiant-ridge-14918-d37205a74752.herokuapp.com/api/subjects";

    //This function gets all subjects and populates the dropdown
    async function getSubjects() {
        const subjectsResponse = await fetch(subjectsEndpoint);
        const subjectsData = await subjectsResponse.json(); //HOLDS SUBJECT JSON
        let subjectNames = [];
        subjectNames = subjectsData.map(function(element) {return element;});
        const subjectSelectElement = document.getElementById("subject-select");
        //populating the dropdown with option tags
        subjectNames.forEach(subject => {
            const option = document.createElement("option");
            option.textContent = subject.longName;
            option.value = subject.shortName;
            subjectSelectElement.appendChild(option);
        });
        $('.selectpicker').selectpicker('refresh');
    }
    getSubjects();


    //Start of courses section, grab some elements
    const subjectSelectElement = document.getElementById("subject-select");
    const courseSelectElement = document.getElementById("course-select");
    // Function to populate courses based on selected subject
    async function populateCourses(subjectId) {
        let coursesEndpoint = `https://radiant-ridge-14918-d37205a74752.herokuapp.com/api/subjects/${subjectId}/courses`;
        const response = await fetch(coursesEndpoint);
        const coursesData = await response.json();

        courseSelectElement.innerHTML = '';

        coursesData.forEach(course => {
            const option = document.createElement('option');
            option.value = course.number;
            option.textContent = course.displayTitle;
            courseSelectElement.appendChild(option);
        });

        courseSelectElement.removeAttribute('disabled');
        $('.selectpicker').selectpicker('refresh');
    }

    // Event Listener for when a subject is selected
    subjectSelectElement.addEventListener('change', function(e) {
        const selectedSubject = this.value;
        populateCourses(selectedSubject);
    });

    const sectionSelectElement = document.getElementById("section-select");
    //Populate the sections dropdown
    async function populateSections(subjectId, courseId) {
        let sectionsEndpoint = `https://radiant-ridge-14918-d37205a74752.herokuapp.com/api/subjects/${subjectId}/courses/${courseId}/sections`;
        const response = await fetch(sectionsEndpoint);
        const sectionsData = await response.json();

        //parses time, turns 24 hr raw int into a nice 12 hr with am/pm
        function formatTime(time) {
            let hours = Math.floor(time / 100);
            let minutes = time % 100;
            let ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            let strTime = hours + ":" + minutes + ' ' + ampm;
            return strTime;
        }

        sectionSelectElement.innerHTML = '';
        let realData = sectionsData[0].sections;
        realData.forEach(section => {
            const option = document.createElement('option');
            option.value = section.sectionNumber;
            let days = section.meetings[0].days;
            let startTime = formatTime(section.meetings[0].startTime);
            let endTime = formatTime(section.meetings[0].endTime);
            let location = section.meetings[0].location;
            let instructorName = "N/A";
            if (section.instructors.length > 0) {
                instructorName = section.instructors[0].name;
            }
            option.textContent = `Section ${section.sectionNumber} on ${days} from ${startTime} to ${endTime} at ${location} with ${instructorName}`;
            sectionSelectElement.appendChild(option);
        });
        sectionSelectElement.removeAttribute('disabled');
        $('.selectpicker').selectpicker('refresh');
    }

    //Event listener for courses dropdown
    courseSelectElement.addEventListener('change', function(e) {
        const selectedSubject = subjectSelectElement.value;
        const selectedCourse = this.value;
        populateSections(selectedSubject, selectedCourse);
    });


    //Event listener for Add Course to Schedule Button
    document.getElementById('add-btn').addEventListener('click', function() {
        const subjectText = subjectSelectElement.options[subjectSelectElement.selectedIndex].text;
        const courseText = courseSelectElement.options[courseSelectElement.selectedIndex].text;
        const sectionText = sectionSelectElement.options[sectionSelectElement.selectedIndex].text;

        // Create a new div element for the course
        let scheduleItem = document.createElement('div');
        scheduleItem.className = 'schedule-item';

        // Div for course information
        let contentDiv = document.createElement('div');
        contentDiv.className = 'schedule-item-content';

        // Add subject, course, and section information
        let subjectPara = document.createElement('p');
        subjectPara.textContent = subjectText;
        subjectPara.className = 'schedule-item-title';
        contentDiv.appendChild(subjectPara);

        let coursePara = document.createElement('p');
        coursePara.textContent = courseText;
        contentDiv.appendChild(coursePara);

        let sectionPara = document.createElement('p');
        sectionPara.textContent = sectionText;
        contentDiv.appendChild(sectionPara);

        scheduleItem.appendChild(contentDiv);

        // Add a remove button
        let removeBtn = document.createElement('button');
        removeBtn.className = 'remove-course';
        removeBtn.innerHTML = '&times;'; // Using the HTML entity for a multiplication sign as the remove icon
        removeBtn.addEventListener('click', function() {
            scheduleItem.remove();
        });

        scheduleItem.appendChild(removeBtn);

        // Add the new element to the schedule list
        document.getElementById('schedule-list').appendChild(scheduleItem);

        //logic for clearing
        subjectSelectElement.selectedIndex = 0;
        courseSelectElement.innerHTML = '';
        courseSelectElement.setAttribute('disabled', 'disabled');
        sectionSelectElement.innerHTML = '';
        sectionSelectElement.setAttribute('disabled', 'disabled');
        $('.selectpicker').selectpicker('refresh');

    });

    //GENERATE FINALS SCHEDULE
    document.getElementById('generate-btn').addEventListener('click', function(){
        let scheduleItems = document.querySelectorAll("#schedule-list .schedule-item");
        let finalsExams = [];
        scheduleItems.forEach(function(item) {
            let paragraphs = item.querySelectorAll(".schedule-item-content p");
            let subjectTitle = paragraphs[0].textContent;
            let courseTitle = paragraphs[1].textContent;
            let sectionTitle = paragraphs[2].textContent;
            finalsExams.push(generateFinalsTimes(subjectTitle, courseTitle, sectionTitle));
        });
        //somehow add it to the  existing calendar here, the array that has finalExams
        calendar.removeAllEvents();
        finalsExams.forEach(exam => {calendar.addEvent(exam)});
    });

    function generateFinalsTimes(subjectTitle, courseTitle, sectionTitle) {
        let dayIndex = sectionTitle.indexOf(" on ") + 4;
        let firstMeetingDay = sectionTitle.substring(dayIndex, dayIndex + 1);
        let timeIndex = sectionTitle.indexOf("from ") + 5;
        let endTimeIndex = sectionTitle.indexOf(" to");
        let startTime = convertTo24HourTime(sectionTitle.substring(timeIndex, endTimeIndex));//24 hr time, ex ("8:00 AM") -> 800
        let finalExam = {};
        if (firstMeetingDay === "M") {
            if (startTime >= 800 && startTime <= 849) {
                finalExam = {title: courseTitle, start: "2024-04-25T08:00:00", end: "2024-04-25T09:45:00", allDay: false};
            } else if(startTime >= 850 && startTime <= 939) {
                finalExam = {title: courseTitle, start: "2024-04-26T10:00:00", end: "2024-04-26T11:45:00", allDay: false};
            } else if (startTime >= 940 && startTime <= 1029) {
                finalExam = {title: courseTitle, start: "2024-04-25T10:00:00", end: "2024-04-25T11:45:00", allDay: false};
            } else if (startTime >= 1030 && startTime <= 1119) {
                finalExam = {title: courseTitle, start: "2024-04-29T12:00:00", end: "2024-04-29T13:45:00", allDay: false};
            } else if (startTime >= 1120 && startTime <= 1209) {
                finalExam = {title: courseTitle, start: "2024-04-26T12:00:00", end: "2024-04-26T13:45:00", allDay: false};
            } else if (startTime >= 1210 && startTime <= 1259) {
                finalExam = {title: courseTitle, start: "2024-04-30T12:00:00", end: "2024-04-30T13:45:00", allDay: false};
            } else if (startTime >= 1300 && startTime <= 1349) {
                finalExam = {title: courseTitle, start: "2024-04-29T14:00:00", end: "2024-04-29T15:45:00", allDay: false};
            } else if (startTime >= 1350 && startTime <= 1439) {
                finalExam = {title: courseTitle, start: "2024-04-30T16:00:00", end: "2024-04-30T17:45:00", allDay: false};
            } else if (startTime >= 1440 && startTime <= 1529) {
                finalExam = {title: courseTitle, start: "2024-04-26T16:00:00", end: "2024-04-26T17:45:00", allDay: false};
            } else if (startTime >= 1530 && startTime <= 1619) {
                finalExam = {title: courseTitle, start: "2024-04-29T16:00:00", end: "2024-04-29T17:45:00", allDay: false};
            } else if (startTime >= 1620 && startTime <= 1709) {
                finalExam = {title: courseTitle, start: "2024-04-25T18:00:00", end: "2024-04-25T19:45:00", allDay: false};
            } else if (startTime >= 1710 && startTime <= 1759) {
                finalExam = {title: courseTitle, start: "2024-04-30T18:00:00", end: "2024-04-30T19:45:00", allDay: false};
            } else if (startTime >= 1800 && startTime <= 2200) {
                finalExam = {title: courseTitle, start: "2024-04-29T20:00:00", end: "2024-04-29T21:45:00", allDay: false};
            }
        } else if(firstMeetingDay === "T") {
            if (startTime >= 800 && startTime <= 849) {
                finalExam = {title: courseTitle, start: "2024-04-24T08:00:00", end: "2024-04-24T09:45:00", allDay: false};
            } else if(startTime >= 850 && startTime <= 939) {
                finalExam = {title: courseTitle, start: "2024-04-29T08:00:00", end: "2024-04-29T09:45:00", allDay: false};
            } else if (startTime >= 940 && startTime <= 1029) {
                finalExam = {title: courseTitle, start: "2024-04-30T08:00:00", end: "2024-04-30T09:45:00", allDay: false};
            } else if (startTime >= 1030 && startTime <= 1119) {
                finalExam = {title: courseTitle, start: "2024-04-29T10:00:00", end: "2024-04-29T11:45:00", allDay: false};
            } else if (startTime >= 1120 && startTime <= 1209) {
                finalExam = {title: courseTitle, start: "2024-04-30T10:00:00", end: "2024-04-30T11:45:00", allDay: false};
            } else if (startTime >= 1210 && startTime <= 1259) {
                finalExam = {title: courseTitle, start: "2024-04-25T14:00:00", end: "2024-04-25T15:45:00", allDay: false};
            } else if (startTime >= 1300 && startTime <= 1349) {
                finalExam = {title: courseTitle, start: "2024-04-30T14:00:00", end: "2024-04-30T15:45:00", allDay: false};
            } else if (startTime >= 1350 && startTime <= 1439) {
                finalExam = {title: courseTitle, start: "2024-04-24T14:00:00", end: "2024-04-24T15:45:00", allDay: false};
            } else if (startTime >= 1440 && startTime <= 1529) {
                finalExam = {title: courseTitle, start: "2024-04-26T14:00:00", end: "2024-04-26T15:45:00", allDay: false};
            } else if (startTime >= 1530 && startTime <= 1619) {
                finalExam = {title: courseTitle, start: "2024-04-29T18:00:00", end: "2024-04-29T19:45:00", allDay: false};
            } else if (startTime >= 1620 && startTime <= 1709) {
                finalExam = {title: courseTitle, start: "2024-04-30T20:00:00", end: "2024-04-30T21:45:00", allDay: false};
            } else if (startTime >= 1710 && startTime <= 1759) {
                finalExam = {title: courseTitle, start: "2024-04-26T20:00:00", end: "2024-04-26T21:45:00", allDay: false};
            } else if (startTime >= 1800 && startTime <= 2200) {
                finalExam = {title: courseTitle, start: "2024-04-25T20:00:00", end: "2024-04-25T21:45:00", allDay: false};
            }
        } else if(firstMeetingDay === "W") {
            if (startTime >= 800 && startTime <= 919) {
                finalExam = {title: courseTitle, start: "2024-04-26T08:00:00", end: "2024-04-26T09:45:00", allDay: false};
            } else if (startTime >= 920 && startTime <= 1039) {
                finalExam = {title: courseTitle, start: "2024-04-24T10:00:00", end: "2024-04-24T11:45:00", allDay: false};
            } else if (startTime >= 1040 && startTime <= 1159) {
                finalExam = {title: courseTitle, start: "2024-04-24T12:00:00", end: "2024-04-24T13:45:00", allDay: false};
            } else if (startTime >= 1200 && startTime <= 1319) {
                finalExam = {title: courseTitle, start: "2024-04-25T12:00:00", end: "2024-04-25T13:45:00", allDay: false};
            } else if (startTime >= 1320 && startTime <= 1439) {
                finalExam = {title: courseTitle, start: "2024-04-24T16:00:00", end: "2024-04-24T17:45:00", allDay: false};
            } else if (startTime >= 1440 && startTime <= 1559) {
                finalExam = {title: courseTitle, start: "2024-04-25T16:00:00", end: "2024-04-25T17:45:00", allDay: false};
            } else if (startTime >= 1600 && startTime <= 1719) {
                finalExam = {title: courseTitle, start: "2024-04-24T18:00:00", end: "2024-04-24T19:45:00", allDay: false};
            } else if (startTime >= 1720 && startTime <= 1839) {
                finalExam = {title: courseTitle, start: "2024-04-26T18:00:00", end: "2024-04-26T19:45:00", allDay: false};
            } else if (startTime >= 1840 && startTime <= 2200) {
                finalExam = {title: courseTitle, start: "2024-04-24T20:00:00", end: "2024-04-24T21:45:00", allDay: false};
            }
        }
        return finalExam;
    }

    function convertTo24HourTime(timeString) {
        const [time, modifier] = timeString.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        
        if (modifier === "PM" && hours < 12) {
            hours += 12;
        }
        if (modifier === "AM" && hours === 12) {
            hours = 0;
        }
        return hours * 100 + minutes;
    }

    //Init calendar portion
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGrid',
        initialDate: '2024-04-24',
        headerToolbar: {
            left: '',
            center: 'title',
            right: ''
        },
        titleFormat: function() {return 'Finals Schedule';},
        views: {
            dayGrid: {
                type: 'dayGrid',
                duration: { days: 7 },
                dayCount: 7
            }
        },
        visibleRange: {
            start: '2024-04-24',
            end: '2024-05-01'
        },
        themeSystem: 'bootstrap5',
        fixedWeekCount: false
    });
    calendar.render();
});

