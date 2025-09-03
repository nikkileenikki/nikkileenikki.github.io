console.log("Git testtttttttttttttttttttttttttttttttttttttttttt")
  setTimeout(() => {
    function updateSize2() {
      centerWidth = document.getElementById('center').offsetWidth;
      centerHeight = document.getElementById('center').offsetHeight;
      panelWidth = (innerWidth - (centerWidth/0.8)) / 2;
      panelHeight = centerHeight + 500;
      gsap.set(".left, .right", { width: panelWidth });
      const leftPanelContent = document.querySelector(".left #image2");
      const rightPanelContent = document.querySelector(".right #image3");
      console.log(panelWidth /2);

      let posTopPanel = panelWidth /2;
      if(posTopPanel < 180){
        leftPanelContent.style.top = panelWidth / 2+ "px";
        rightPanelContent.style.top = panelWidth / 2+ "px";
      }else{
        leftPanelContent.style.top = "40px";
        rightPanelContent.style.top = "40px";
      }  console.log("resize");    
    }

  window.removeEventListener("resize", updateSize);
  window.addEventListener("resize", updateSize2);


  }, 3000);
