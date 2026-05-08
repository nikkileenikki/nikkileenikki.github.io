var distance = {{layout.slide_width}};
var numSlides = {{slides.length}};
var slideLength = distance * Math.max(numSlides - 1, 0);
var currentSlide = 1;
var previousSlide = 0;
var slider = gsap.to('.slides', {});
var autoplayDelay = {{autoplay_delay}};
var transitionDuration = {{transition_duration}};
var shuffleSlides = {{shuffle}};
var enableSwipe = {{enable_swipe}};

function initCarouselTemplate() {
  gsap.set('.slides', {
    x: function(i) { return i * distance; }
  });

  gsap.set('#container', { autoAlpha: 1 });

  bindCarouselTemplateEvents();
}

function bindCarouselTemplateEvents() {
  $('.arrow-left').on('click', onLeftArrowClick);
  $('.arrow-right').on('click', onRightArrowClick);

  $('.slides').each(function() {
    const clickIndex = parseInt($(this).attr('data-click-index'), 10) || 1;
    const clickUrl = $(this).attr('data-click-url') || '';

    $(this).on('click', function() {
      myFT.clickTag(clickIndex, clickUrl);
    });
  });

  $('.clickTag').on('click', function() {
    const firstSlide = $('.slides').first();
    const clickIndex = parseInt(firstSlide.attr('data-click-index'), 10) || 1;
    const clickUrl = firstSlide.attr('data-click-url') || '';
    myFT.clickTag(clickIndex, clickUrl);
  });

  if (enableSwipe) {
    const track = document.getElementById('slide');
    let startX = 0;

    track.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    });

    track.addEventListener('touchend', e => {
      const endX = e.changedTouches[0].clientX;
      const diff = endX - startX;
      if (diff > 50) onLeftArrowClick();
      if (diff < -50) onRightArrowClick();
    });
  }

  if (shuffleSlides === true || shuffleSlides === 'true' || shuffleSlides === 'TRUE') {
    shuffleCarouselSlides();
  }
}

function shuffleCarouselSlides() {
  const container = document.getElementById('slide');
  const items = Array.prototype.slice.call(container.getElementsByClassName('slides'));
  items.forEach(item => container.removeChild(item));

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = items[i];
    items[i] = items[j];
    items[j] = temp;
  }

  items.forEach(item => container.appendChild(item));
}

function onLeftArrowClick() {
  if (!slider.isActive()) {
    slider = gsap.to('.slides', {
      duration: transitionDuration,
      ease: 'power1.inOut',
      x: '+=' + distance,
      modifiers: {
        x: gsap.utils.unitize(gsap.utils.wrap(-distance, slideLength || distance))
      },
      onStart: function() {
        if (currentSlide === 1) {
          currentSlide = numSlides;
        } else {
          previousSlide = currentSlide;
          currentSlide = currentSlide - 1;
        }
      }
    });
  }
}

function onRightArrowClick() {
  if (!slider.isActive()) {
    slider = gsap.to('.slides', {
      duration: transitionDuration,
      ease: 'power1.inOut',
      x: '-=' + distance,
      modifiers: {
        x: gsap.utils.unitize(gsap.utils.wrap(-distance, slideLength || distance))
      },
      onStart: function() {
        if (currentSlide === numSlides) {
          currentSlide = 1;
        } else {
          previousSlide = currentSlide;
          currentSlide = currentSlide + 1;
        }
      }
    });
  }
}

window.onload = initCarouselTemplate;
