import videoUrl from '../assets/video.mp4'

export default function Home() {
    return(
        <>
        <h1 className="titleMain">Rate</h1>
        <h1 className="titleSub">"A new way to rate"</h1>
        <div class="full-page-black"></div>
        <video autoPlay loop muted playsInline disablePictureInPicture className='video'>
            <source src={videoUrl} type="video/mp4" />
        </video>
        </>
    )
}