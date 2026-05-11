const container = myFT.$("#mainContainer");
let iframeCount = 0; 
myFT.on("load", start);

function start() {
    clickTag = myFT.$(".clickTag");
    myFT.applyClickTag(clickTag, 1);
    addEvents();
}

function setCollapseFrame(){
    window.parent.postMessage({
        source: "iframe",
        event: "requestCollapseFrame",
    },"*" );
    window.parent.parent.postMessage({
        source: "iframe",
        event: "requestCollapseFrame",
    },"*" );

    videoControl("pause");
    gsap.to("#mainContainer", {y:450, duration: 0.5, ease: "power2.inOut" });
    gsap.to("#small_close_btn", { opacity: 0, duration: 0.3, ease: "power2.inOut" });
}

function addEvents() {
    $("#video1").on("ended", function () {
        videoControl("pause");
    });
    $(".play").on("click", function (e) {
        videoControl("play");
    });
    $(".pause").on("click", function (e) {
        videoControl("pause");
    });
    $(".mute").on("click", function (e) {
        videoControl("unmute");
    });
    $(".unmute").on("click", function (e) {
        videoControl("mute");
    });
    $("#video1").on("ended", function (e) {
        onEnded();
    });
    $("#video1").on("click", function (e) {
       myFT.clickTag(1);
        videoControl("pause");
    });
    $(".clickTag").on("click",function(e){
        videoControl("pause");        
    });
    $("#small_close_btn").on("click",function(e) {
        setCollapseFrame();
        myFT.tracker("close");
    })
}

function videoControl(e) {
    switch (e) {
        case "play":
        $("#video1").get(0).play();
        gsap.set(".play", { autoAlpha: 0 });
        gsap.set(".pause", { autoAlpha: 1 });
        $(".end-frame").hide().css("opacity",0);
        break;
        case "pause":
        $("#video1").get(0).pause();
        gsap.set(".play", { autoAlpha: 1 });
        gsap.set(".pause", { autoAlpha: 0 });
        break;
        case "mute":
        $("#video1").prop("muted", true);
        gsap.set(".mute", { autoAlpha: 1 });
        gsap.set(".unmute", { autoAlpha: 0 });
        break;
        case "unmute":
        $("#video1").prop("muted", false);
        gsap.set(".mute", { autoAlpha: 0 });
        gsap.set(".unmute", { autoAlpha: 1 });
        break;
        default:
    }
}
function onEnded() {
    $(".end-frame").css("opacity",1);
    $(".end-frame").css("display","flex");
    $(".end-frame").css("zIndex",5);
    $(".end-frame").on("click", function () {
        videoControl("play");
        $(".end-frame").css("opacity",0);
        $(".end-frame").css("zIndex",2);
    });
}

myFT.on("expand", function(){});
myFT.contract = function(){};
    
