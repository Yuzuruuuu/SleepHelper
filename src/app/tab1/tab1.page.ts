import { Component, OnInit, inject } from '@angular/core';
import { Directory, Encoding, FileInfo, Filesystem } from '@capacitor/filesystem';
import { AudioFileService } from '../audio-file.service';
import { RangeCustomEvent } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page implements OnInit {
  private readonly fileService = inject(AudioFileService);

  audios: Map<FileInfo, string> = this.fileService.files;
  private audioPlayer: HTMLAudioElement | null = null;
  isPlaying = false;
  progress = 0;
  currentFileIndex = 0;
  audioFiles: string[] = [];
  currentFileName = '';
  isLooping = false;
  duration: number = 0;
  currentTime: number = 0;
  currentProgress: number = 0;    // 当前播放进度 (0-100)

  async ngOnInit(): Promise<void> {
    await this.fileService.readFiles();
    this.audios = this.fileService.files;

    // 监听音频播放过程中的事件，用于更新播放进度
    if(this.audioPlayer){
      this.audioPlayer.addEventListener('timeupdate', () => {
        this.updateProgress();
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input === null || input.files === null) throw new Error('File input not available');

    const file = input.files.item(0);

    if (file === null) throw new Error('File does not exist');

    this.fileService.writeFile(file);
    this.audios = this.fileService.files;
  }

  async deleteFile(fileInfo: FileInfo): Promise<void> {
    this.fileService.deleteFile(fileInfo);
    this.audios = this.fileService.files;
  }

  async writeDemoFile(): Promise<void> {
    const result = await Filesystem.writeFile({
      path: 'files/sample.txt',
      data: 'This is a sample text file',
      directory: Directory.External,
      encoding: Encoding.UTF8,
      recursive: true
    });
  }

  async readDemoFile(): Promise<void> {
    const result = await Filesystem.readFile({
      path: 'files/sample.txt',
      directory: Directory.External,
      encoding: Encoding.UTF8
    });
  }

  playAll() {
    this.audioFiles = Array.from(this.audios.values());
    this.currentFileIndex = 0;
    this.playCurrentFile();
  }

  togglePlayPause() {
    this.audioFiles = Array.from(this.audios.values());
    if (this.isPlaying) {
      this.pause();
    } else {
      if (this.audioPlayer) {
        this.play();
      } else {
        this.playAll();
      }
    }
  }

  playNext() {
    this.audioFiles = Array.from(this.audios.values());
    if (this.audioPlayer) { 
      this.audioPlayer.pause();}
    this.currentFileIndex++;
    if (this.currentFileIndex >= this.audioFiles.length) {
      this.currentFileIndex = 0; // 如果超出索引范围，从第一个文件开始
    }
    this.playCurrentFile();
  }

  playPrevious() {
    this.audioFiles = Array.from(this.audios.values());
    if (this.audioPlayer) { 
      this.audioPlayer.pause();}
    this.currentFileIndex--;
    if (this.currentFileIndex < 0) {
      this.currentFileIndex = this.audioFiles.length - 1; // 如果超出索引范围，从最后一个文件开始
    }
    this.playCurrentFile();
  }

  toggleLooping() {
    this.isLooping = !this.isLooping;
  }

  private play() {
    if (this.audioPlayer) {
      this.audioPlayer.play();
      this.isPlaying = true;
      this.updateProgress();
    }
  }

  private pause() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    }
  }

  private playCurrentFile() {
    this.audioFiles = Array.from(this.audios.values());
    if (this.currentFileIndex >= this.audioFiles.length) {
      // 如果当前索引超出数组长度，重置为第一个文件
      this.currentFileIndex = 0;
    } else if (this.currentFileIndex < 0) {
      // 如果当前索引小于0，重置为最后一个文件
      this.currentFileIndex = this.audioFiles.length - 1;
    }

    const [fileInfo, filePath] = Array.from(this.audios.entries())[this.currentFileIndex]; // 获取当前文件信息和路径
    this.currentFileName = fileInfo.name; // 更新当前文件名

    this.audioPlayer = new Audio(this.audioFiles[this.currentFileIndex]);
    this.audioPlayer.play();
    this.isPlaying = true;

    this.audioPlayer.ontimeupdate = () => this.updateProgress();
    this.audioPlayer.onended = () => {
      if (!this.isLooping) {
        this.currentFileIndex++;}
      this.playCurrentFile();
    };
  }

  updateProgress() {
    if(this.audioPlayer){
      this.currentTime = this.audioPlayer.currentTime;
      this.duration = this.audioPlayer.duration;
      this.currentProgress = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100 || 0;
    }
  }

  seekAudio(event: Event) {
    const progress = parseInt((event as RangeCustomEvent).detail.value.toString());
    if (this.audioPlayer) {
      this.audioPlayer.currentTime = (progress / 100) * this.audioPlayer.duration;
    }
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds)) return '--:--';
  
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
  
    return `${this.pad(minutes)}:${this.pad(remainingSeconds)}`;
  }
  
  private pad(val: number): string {
    return val < 10 ? `0${val}` : val.toString();
  }
}
