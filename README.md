[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/c4wSHrp5)
[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=23816622&assignment_repo_type=AssignmentRepo)


Phase 1: Proposal
Team Members: Tanner Watamura, Leo Zhou, William Chen
Project Description
Rate is a web-based platform designed for students to share and access information about professors and courses. It provides core functionalities such as searching for professors, submitting multi-criteria ratings, and reading or posting peer-generated reviews. By aggregating this user-generated data, the platform creates a transparent and reliable information ecosystem that reduces information asymmetry, helps students make better course selection decisions, and ultimately improves their academic planning and overall studying experience.

Core Specifications
User Profiling:
Students: Profiles will include major, year, and a history of reviews posted.
Professors: Profiles will display aggregate ratings, "top tags" for example: Tough Grader, Amazing Lectures, etc), and a list of courses taught.
Authentication & Authorization:
Standard Auth: Secure password-based login.
3rd Party Auth: Implementation of Google Sign-In
Roles: Students can rate/comment, while the Professor can claim a profile/respond to reviews, and Admin can moderate content.
Social Network:
An "Upvote/Downvote" system for reviews to establish a reputation-based social hierarchy of "Helpful Reviewers."
Users can view reviewer profiles and review comment history of other reviewers.
Rating and Commenting:
Multi-metric rating system (Scale of 1-5 for Difficulty, Quality, and Engagement).
Text-based comments for qualitative feedback.
Search and Recommendation System:
Search: Filter by department, name, or course code.
Smart Recommendation: When viewing a professor, the system will suggest "Similar Professors" in the same department or those who teach the same course, ranked by rating.
Admin Functionalities:
Dashboard to flag/delete inappropriate reviews.
Tools to bulk-import professor data to initialize the database.

Revised Technical Architecture (Node.js & MongoDB)
Backend Framework: We will use Node.js with the Express.js web framework to handle routing and middleware.
Database: MongoDB will be our primary database, utilizing Mongoose as our ODM (Object Data Modeling) library to manage schemas for Professors, Reviews, and Users.
Authentication:
Local: Passport.js with a local strategy for encrypted password storage.
3rd Party: Passport-Google-OAuth20 to allow students to log in using their emails or student emails if they prefer.
Security Implementation:
NoSQL Injection: We will use Mongoose to enforce strict schemas and some middleware to remove dangerous MongoDB operators
Rate limiting to prevent spam reviews

Project Plan & Task Allocation
Meeting Schedule: We plan to meet weekly on monday after lab sessions and use Slack for daily coordination.
Division of Labor:
William: Authentication, roles, profiles, admin, security
 Tanner: Frontend, UI/UX, social features, search/review interface
 Leo: Database, review backend, professor model, search/recommendation logic

Project Challenges
Asynchronous Flow: Managing complex asynchronous operations (like calculating a professor's aggregate rating while fetching reviews) 
Data Consistency: Ensuring that when a student deletes their account, their reviews are handled correctly (either deleted or anonymized) within our NoSQL structure.
Not very familiar with those required tech stack

<img width="624" height="374" alt="Screenshot 2026-04-27 at 11 18 38 AM" src="https://github.com/user-attachments/assets/cdd51b24-eb4b-4b82-8800-501238d788f9" />
<img width="623" height="333" alt="Screenshot 2026-04-27 at 11 19 04 AM" src="https://github.com/user-attachments/assets/a6f33215-f290-471a-b67b-b13d9cae0dd0" />
