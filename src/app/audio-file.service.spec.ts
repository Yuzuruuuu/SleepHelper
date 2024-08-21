import { TestBed } from '@angular/core/testing';

import { AudioFileService } from './audio-file.service';

describe('FileService', () => {
  let service: AudioFileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioFileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
