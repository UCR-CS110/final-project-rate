export default function Navbar() {
    return(
        <nav className="navbar">
            <a href= "/" className="title">Rate</a>
            <a href= "/search" className="search">Search Professors</a>
            <ul>
                <li>
                    <a href= "/login" className="subTitle">Log In</a>
                </li>
                <li>
                    <a href= "/about" className="subTitle">About</a>
                </li>
            </ul>
        </nav>
    )
}