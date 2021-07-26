import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import uniqueRandom from 'unique-random';
import { Animation, AnimationController } from '@ionic/angular';
import { splitEvery } from 'rambda';
import { photoSources } from './photoSources';

const verticalMovement = 30;
const circleDiameter = 100;
const smallestScale = 1;
const biggestScale = 1.4;
const animateXDurationRatio = 10;

@Component({
  selector: 'app-photos',
  templateUrl: './photos.component.html',
  styleUrls: ['./photos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhotosComponent implements AfterViewInit {
  @ViewChildren('photo')
  public photos: QueryList<ElementRef>;
  @ViewChild('photosContainer')
  public photosContainer: ElementRef;
  public photoSources: Array<string> = photoSources;

  private animationRefs: Map<number, Animation> = new Map();
  private randomIn = uniqueRandom;
  private canPlayIndefinitely = false;

  constructor(private cdr: ChangeDetectorRef,
              private animationCtrl: AnimationController) {
  }

  private static shuffle(array) {
    // Fisher-Yates shuffle algorithm
    // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    const clone = array.slice();
    for (let i = clone.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
  }

  public ngAfterViewInit(): void {
    this.play();
  }

  private config() {
    const containerHeight = this.photosContainer.nativeElement.offsetHeight;
    const containerWidth = window.innerWidth;
    // console.log('WIDTHS config ====>', window.innerWidth, this.photosContainer.nativeElement.offsetWidth);
    const startYRandom = this.randomIn(0, containerHeight - verticalMovement - (circleDiameter * biggestScale));
    const photos = PhotosComponent.shuffle(this.photos.toArray());
    const maxPhotosInView = containerWidth / (circleDiameter * biggestScale);
    const animateYDuration = this.randomIn(2000, 3000);
    const animateXDuration = animateXDurationRatio * containerWidth;
    const minWidth = photos.length * circleDiameter * biggestScale;
    const scaleRandom = () => this.randomIn(smallestScale * 10, biggestScale * 10)() * 0.1;
    const clusterSize = Math.floor(maxPhotosInView);
    const clusters = splitEvery(clusterSize, photos);
    this.canPlayIndefinitely = containerWidth > minWidth;
    const startX = (clusterIndex) => {
      const clusterWidth = containerWidth > minWidth ? (containerWidth / clusters.length) : containerWidth;
      const clusterXValues = [0];
      let currentX = 0;
      for (let i = 1; i < clusterSize; i++) {
        let nextX = currentX + (clusterWidth * (1 / clusterSize)) + circleDiameter;
        nextX = containerWidth > minWidth ? nextX + (clusterIndex * clusterWidth) : nextX;
        currentX = nextX;
        clusterXValues.push(nextX);
      }
      return clusterXValues;
    };
    console.log(`Animation config
    Cluster Size: ${clusterSize},
    Can Play Indefinitely? ${this.canPlayIndefinitely},
    Min Width required to fit all photos: ${minWidth},
    Container Width: ${containerWidth}`);

    return {
      animateXDuration,
      animateYDuration,
      startYRandom,
      startX,
      scaleRandom,
      clusters
    };
  }

  private createAnimations() {
    const {
      animateXDuration,
      animateYDuration,
      startYRandom,
      scaleRandom,
      clusters
    } = this.config();
    const l = clusters.length;
    clusters.slice(0, l).forEach((cluster, i) => {
      const xyAnimations = cluster.map((photoRef, j) => {
        const animateXDelay = animateXDuration * j / cluster.length;
        // console.log('animateXDelay', animateXDelay);
        const [animateY, animateX] = this.createAnimation({
          photoRef,
          startYRandom,
          scaleRandom,
          animateYDuration,
          animateXDuration,
          animateXDelay
        });
        animateY.play();

        return animateX;
      });
      const clusterAnimations = this.animationCtrl.create(`cluster-${i}`)
        .addAnimation(xyAnimations);
      this.animationRefs.set(i, clusterAnimations);
    });

    return clusters;
  }

  private playAnimations(clusters): void {
    const iterator = this.animationRefs.values();
    const animations = Array.from(iterator);
    const containerWidth = this.photosContainer.nativeElement.offsetWidth;
    const animateXDuration = animateXDurationRatio * containerWidth;
    const playInSequence = () => {
      clusters.forEach((cluster, i) => {
        setTimeout(() => {
          if (i === clusters.length - 1 && !this.canPlayIndefinitely) {
            animations[i].play().then(() => this.play());
            return;
          }
          animations[i].play();
        }, i * animateXDuration);
      });
    };
    playInSequence();
  }

  private play() {
    setTimeout(() => {
      const clusters = this.createAnimations();
      this.playAnimations(clusters);
    }, 500);
  }

  private createAnimation({
                            photoRef,
                            startYRandom,
                            scaleRandom,
                            animateYDuration,
                            animateXDuration,
                            animateXDelay
                          }): Animation[] {
    const scale = scaleRandom();
    const animateY = this.animateY(photoRef, animateYDuration, startYRandom);
    const animateX = this.animateX({
      photoRef,
      animateXDuration,
      animateXDelay,
      scale
    });

    return [animateY, animateX];
  }

  private animateY(photoRef, animateYDuration, startYRandom) {
    const startY = startYRandom();
    photoRef.nativeElement.style.top = `${startY}px`;
    return this.animationCtrl.create()
      .addElement(photoRef.nativeElement)
      .iterations(Infinity)
      .direction('alternate')
      .easing('ease-in-out')
      .duration(animateYDuration())
      .fromTo('marginTop', 0, `${verticalMovement}px`);
  }

  private animateX({
                     photoRef,
                     animateXDuration,
                     animateXDelay,
                     scale
                   }) {
    const containerWidth = this.photosContainer.nativeElement.offsetWidth;
    photoRef.nativeElement.style.left = `0px`;
    return this.animationCtrl.create()
      .addElement(photoRef.nativeElement)
      .easing('linear')
      .duration(animateXDuration)
      .iterations(this.canPlayIndefinitely ? Infinity : 1)
      .delay(animateXDelay)
      .beforeStyles({opacity: 1})
      .afterStyles({opacity: 0})
      .fromTo('transform', `translateX(${containerWidth}px) scale(${scale})`, `translateX(-${circleDiameter * scale}px) scale(${scale})`);
  }
}
