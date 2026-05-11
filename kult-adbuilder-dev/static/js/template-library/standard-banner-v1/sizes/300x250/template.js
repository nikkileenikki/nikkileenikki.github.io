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
			tl = gsap.timeline(); 
			tl
			.from(".logo", {autoAlpha: 0, scale: 0.7, y: 10, ease:"back.out(2.5)"},"0")
			.from(".product, .text", {autoAlpha: 0, scale: 0.9, x: 50, ease:"power.in4", stagger: 0.3},"+=0.2")
			.from(".cta", {autoAlpha: 0, scale: 1, x: 30, ease:"power.in4"},"+=0.2")
			.add(function(){

			})
		}
		function click1(){
			myFT.clickTag(1, "");
		}	
		window.onload = function(){
			init();
		}
