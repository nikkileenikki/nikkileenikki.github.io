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
		window.onload = function(){
			init();
		}
