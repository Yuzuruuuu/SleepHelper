import { Component, OnInit, inject } from '@angular/core';
import { AudioFileService } from '../audio-file.service';
import { FileInfo } from '@capacitor/filesystem';
import { RangeCustomEvent } from '@ionic/angular';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page implements OnInit {
  //合并软件，蓝牙控制
  private readonly fileService = inject(AudioFileService);

  audios: Map<FileInfo, string> = this.fileService.files;  // 存储音频文件的Map
  Data: string = this.fileService.receivedData;
  selectedFilePaths: string[] = [];  // 存储用户选择的文件路径
  addedFiles: string[] = [];  // 用户添加的文件列表
  
  currentAudioIndex: number = 0;  // 当前播放的音频索引
  isBegin: boolean = false;
  isTriggerred: boolean = false;
  toggleMode: boolean = false;
  isPlaying: boolean = false;     // 当前是否正在播放
  audioPlayer: HTMLAudioElement = new Audio(); // HTML5音频播放器

  currentFileName: string = '';   // 当前播放的文件名
  duration: number = 0;
  currentTime: number = 0;
  currentProgress: number = 0;    // 当前播放进度 (0-100)
  playMode: 'loop' | 'single' = 'loop';  // 播放模式，'loop' 为列表循环，'single' 为单曲循环

  async ngOnInit(): Promise<void> {
    // 从AudioFileService中获取文件列表
    await this.fileService.readFiles();
    this.audios = this.fileService.files;

    // 监听音频播放过程中的事件，用于更新播放进度
    this.audioPlayer.addEventListener('timeupdate', () => {
     this.updateProgress();
    });

    // 定期检查 audios 变化并同步 addedFiles
    setInterval(() => {
      this.syncAddedFilesWithAudios();
      this.Data = this.fileService.receivedData;
      if(this.Data === '1' && this.isTriggerred === false){
        this.playAudio(this.currentAudioIndex);
        this.isTriggerred = true;
      }
      else if(this.Data === '2'){
        if(this.Data === '2' && this.toggleMode === false){
          this.pauseAudio();
          this.toggleMode = true;
          setTimeout(() => {
            this.fileService.receivedData = '0';
            this.Data = this.fileService.receivedData;
          }, 1000);
        }
        // else {
        //   this.playAudio(this.currentAudioIndex);
        //   this.toggleMode = false;
        //   setTimeout(() => {
        //     this.fileService.receivedData = '0';
        //     this.Data = this.fileService.receivedData;
        //   }, 1000);
        // }
      }
    }, 1000); // 每秒检查一次
  }

  // 同步 addedFiles 和 audios
  private syncAddedFilesWithAudios() {
    const audioFileNames = Array.from(this.audios.keys()).map(fileInfo => fileInfo.name);
    this.addedFiles = this.addedFiles.filter(fileName => audioFileNames.includes(fileName));
  }

  // 当用户从下拉列表中选择文件时触发
  onFilesSelected(event: any) {
    this.selectedFilePaths = event.detail.value; // 获取选中的文件路径数组
    console.log('Selected File Paths:', this.selectedFilePaths);
  }

  // 查找 FileInfo 对象
  findFileInfo(map: Map<FileInfo, string>, filePath: string): FileInfo | undefined {
    return Array.from(map.entries()).find(([fileInfo, path]) => path === filePath)?.[0];
  }

  // 将选中的文件添加到 tab2 的列表中
  addSelectedFiles() {
    this.selectedFilePaths.forEach(filePath => {
      const selectedFileInfo = this.findFileInfo(this.fileService.files, filePath);

      if (selectedFileInfo) {
        const fileName = selectedFileInfo.name;
        if (!this.addedFiles.includes(fileName)) { // 防止重复添加
          this.addedFiles.push(fileName);
        }
      } else {
        console.error('File not found for path:', filePath);
      }
    });

    // 清空已选择的文件路径
    this.selectedFilePaths = [];
  }

  // 全选功能
  selectAllFiles() {
    this.selectedFilePaths = Array.from(this.audios.values());
  }

  removeFile(index: number) {
    if (index >= 0 && index < this.addedFiles.length) {
      this.addedFiles.splice(index, 1);
    }
  }

  // 播放音频
  playAudio(index: number) {
    if (index >= 0 && index < this.addedFiles.length) {
      const filePath = this.findFilePathByName(this.addedFiles[index]);
      if (filePath) {
        if (this.currentAudioIndex !== index) {
          this.audioPlayer.src = filePath;  
          this.currentAudioIndex = index;
          this.audioPlayer.currentTime = 0; // 重置播放时间
          console.log('restart');
        }
        if (this.isBegin === false) {
          this.isBegin = true;
          this.audioPlayer.src = filePath; 
        }      
        this.currentFileName = this.addedFiles[index];
        this.audioPlayer.play();
        this.isPlaying = true;
      
        // 监听音频播放完毕事件
        this.audioPlayer.onended = () => {
          this.onAudioEnded();
        };
      }
    }
  }

  // 暂停音频
  pauseAudio() {
    if (this.isPlaying) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    }
  }

  // 播放下一首音频
  playNext() {
    let nextIndex = this.currentAudioIndex + 1;
    if (nextIndex >= this.addedFiles.length) {
      nextIndex = 0;  // 循环到第一首
    }
    this.audioPlayer.currentTime = 0; 
    this.playAudio(nextIndex);
  }

  // 播放上一首音频
  playPrevious() {
    let prevIndex = this.currentAudioIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.addedFiles.length - 1;  // 循环到最后一首
    }
    this.audioPlayer.currentTime = 0; 
    this.playAudio(prevIndex);
  }

  // 切换播放模式
  togglePlayMode() {
    this.playMode = this.playMode === 'loop' ? 'single' : 'loop';
  }

  // 当音频播放完毕时调用
  onAudioEnded() {
    if (this.playMode === 'loop') {
      this.playNext();
    } else if (this.playMode === 'single') {
      this.playAudio(this.currentAudioIndex);  // 单曲循环
    }
  }

  // 根据文件名查找路径
  findFilePathByName(fileName: string): string | undefined {
    const fileInfo = Array.from(this.audios.keys()).find(info => info.name === fileName);
    return fileInfo ? this.audios.get(fileInfo) : undefined;
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

  seekAudio(event: Event) {
    const progress = parseInt((event as RangeCustomEvent).detail.value.toString());
    this.audioPlayer.currentTime = (progress / 100) * this.audioPlayer.duration;
  }

  updateProgress() {
    this.currentTime = this.audioPlayer.currentTime;
    this.duration = this.audioPlayer.duration;
    this.currentProgress = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100 || 0;
  }

  playAudioFromList(index: number) {
    this.playAudio(index);
  }

  // 添加拖拽处理函数
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.addedFiles, event.previousIndex, event.currentIndex);    
  }

}
