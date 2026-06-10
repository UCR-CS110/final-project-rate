import ucr from "../assets/ucr.jpg";
export default function About() {
    return(
        <div className = "container">
            <br></br>
            <h1>About Us</h1>
            <p className ="about">Rate is a platform for users to review and rate professors.
                Unlike other platforms, rate uses several variables to calculate a professor 
                rating, such as difficulty, workload, and overall experience. 
                This allows students to get a more comprehensive understanding of a 
                professor before enrolling in their class. Rate aims to provide students with
                a more accurate and detailed evaluation of their professors.
            </p>
            <img src= {ucr} alt="UCR campus" />
            <h1>The Team</h1>
            <p className="about">We are a team of three undergraduate students at the University of California, Riverside.
                We created this project as part of our final project for CS110, and we hope it can be  a useful alternative to 
                existing professor review platforms. Rate is developed by Tanner Watamur, Leo Zhou, and William Chen.
            </p>
            </div>
    )
}