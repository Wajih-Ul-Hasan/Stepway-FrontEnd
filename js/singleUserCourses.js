document.addEventListener('DOMContentLoaded', function() {
var getToken = localStorage.getItem("token")
// debugger
if(getToken == null){
    window.location.href = 'index.html';
}



allCoursesData();
function allCoursesData() {
    fetch(stepwayApi('/api/courses'), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json', // Example: Sending JSON data
            'Authorization': `Bearer ${getToken}`, // Example: Sending an authorization token
            // Add any other custom headers as needed
          }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Assuming data is an array of student objects
        const tableBody = document.getElementById('coursesTableBody');

        const tableHeader = document.createElement('tr'); // Create a header row

        tableHeader.innerHTML = `
            <th>ID</th>
            <th>CourseName</th>

            <th>Description</th>
            <th>Discount</th>
            
            <th>Start Date</th>
            <th>End Date</th>
            <th>Price</th>
            <th>Type</th>
            <th>Action</th>

        `;
        tableBody.appendChild(tableHeader);
        
        tableBody.innerHTML = ''; // Clear the table body
        let id = 1;
        data.forEach(courses => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td> ${id}</td>
            <td>${courses.courseName}</td>
            <td>${courses.description}</td>
            <td>${courses.discount}</td>
            <td>${courses.startDate}</td>
            <td>${courses.endDate}</td>
            <td>${courses.price}</td>
            <td>${courses.type}</td>
            <td><button class="addAssessmentBtn btn btn-primary btn-lg" data-courseid="${courses.id}">Assessments</button></td>

            `;
            tableBody.appendChild(row);
            id++;
        });
         // Add event listener to each Assessments button
         const assessmentButtons = document.querySelectorAll('.addAssessmentBtn');
         assessmentButtons.forEach(button => {
             button.addEventListener('click', function() {
                 const courseId = this.getAttribute('data-courseid');
                 fetchAssessmentDataAndRedirect(courseId);
             });
         });
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}

function fetchAssessmentDataAndRedirect(courseId) {
    fetch(stepwayApi(`/api/allAssessments/${courseId}`), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken}`, 
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Redirect to TeacherAssessment.html with courseId as query parameter
        debugger
         const tableBody = document.getElementById('coursesTableBody');
         
         const tableHeader = document.createElement('tr'); // Create a header row
        tableBody.innerHTML = ''; // Clear the table body
        tableHeader.innerHTML = '';

        // window.location.href = `assesment`;

         // Set the header row content
         tableHeader.innerHTML = `
         <th>ID</th>
         <th>Date</th>
         <th>Description</th>
         <th>Course ID</th>

     `;

     tableBody.appendChild(tableHeader);

        let id = 1;
        console.log("data is : ", data);

        data.forEach(courses => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td> ${id}</td>
            <td>${courses.date}</td>
            <td>${courses.description}</td>
            <td>${courses.courseId}</td>
            `;
            tableBody.appendChild(row);
            id++;
        });
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}


function fetchStudentEnrolledCoursesCount() {
    // debugger
    fetch(stepwayApi('/api/countCurrentUserEnrolledCourses'),{
        
        headers: {
            'Content-Type': 'application/json', // Example: Sending JSON data
            'Authorization': `Bearer ${getToken}`, // Example: Sending an authorization token
            // Add any other custom headers as needed
          }
    })
        .then(response => response.text()
        
        )
        .then(data => {
            // console.log(data);
            const studentCountElement = document.getElementById('coursesEnrolledCount');
            studentCountElement.textContent = data; 
        })
        
        .catch(error => {
            console.error('Error fetching data: ' + error);
        });
}

// Call the function to fetch and update the student count when the page loads
fetchStudentEnrolledCoursesCount();

});