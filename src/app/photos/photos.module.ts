import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotosComponent } from './photos.component';
import { IonicModule } from '@ionic/angular';

@NgModule({
  declarations: [PhotosComponent],
  exports: [
    PhotosComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
  ]
})
export class PhotosModule {}
