function init(){
	addEvents()
}
function addEvents() {
	$( ".click" ).on( "click", function() {
		click1();
	} );
	startAnim();
}
function startAnim() {
	gsap.set('#container', {autoAlpha:1});
}
function click1(){
	myFT.clickTag(1, "");
}	
function checkFT(){
	if (myFT.hasLoaded) {
		init();
	}else{	
		setTimeout(() => {
			checkFT()
		}, 100);
	}
}
window.onload = function(){
	checkFT();
}
