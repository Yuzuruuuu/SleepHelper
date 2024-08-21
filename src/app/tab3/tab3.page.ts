import { Component, inject } from '@angular/core';
import { BleClient, dataViewToText, ScanMode, ScanResult, BleService } from '@capacitor-community/bluetooth-le';
import { ToastController } from '@ionic/angular';
import { AudioFileService } from '../audio-file.service';
import { delay } from 'rxjs';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
})
export class Tab3Page {
  private readonly fileService = inject(AudioFileService);

  bluetoothScanResults: ScanResult[] = [];
  bluetoothIsScanning = false;
  bluetoothConnectedDevice?: ScanResult;
  bleServices: BleService[] = [];
  receivedData: string = this.fileService.receivedData;

  readonly pillowServiceUUID = '98ecc0aa-88c5-40f7-aef7-b617d2084bad';
  readonly pillowCharacteristicsUUID = '2e710d43-a911-4346-afb4-7a03dc252e72';
  //readonly enablepillowWiFiCommand = [0x03, 0x17, 0x01, 0x01];

  constructor(public toastController: ToastController) {}

  async ngOnInit() {
    await BleClient.initialize();
    
    // 定期更新pillowCharacteristics
    setInterval(() => {
      this.readFromBluetoothDevice();
    }, 1000); // 每秒检查一次
  }

  async toggle() {
    this.fileService.receivedData = '2';
    this.receivedData = this.fileService.receivedData;
    setTimeout(() => {
      this.fileService.receivedData = '0';
      this.receivedData = this.fileService.receivedData;
    }, 1000);
    
  }

  async scanForBluetoothDevices() {
    try {
      this.bluetoothScanResults = [];
      this.bluetoothIsScanning = true;

      await BleClient.requestLEScan(
        { scanMode: ScanMode.SCAN_MODE_BALANCED },
        this.onBluetoothDeviceFound.bind(this)
      );

      const stopScanAfterMilliSeconds = 3500;
      setTimeout(async () => {
        await BleClient.stopLEScan();
        this.bluetoothIsScanning = false;
      }, stopScanAfterMilliSeconds);
    } catch (error) {
      console.error('scanForBluetoothDevices', error);
      this.bluetoothIsScanning = false;
    }
  }

  onBluetoothDeviceFound(result: ScanResult) {
    console.log('Received new scan result', result);
    this.bluetoothScanResults.push(result);
  }

  async connectToBluetoothDevice(scanResult: ScanResult) {
    const device = scanResult.device;

    try {
      await BleClient.connect(device.deviceId, this.onBluetoothDeviceDisconnected.bind(this));
      this.bluetoothConnectedDevice = scanResult;
      // await this.triggerBluetoothPairing();
      const deviceName = device.name ?? device.deviceId;
      
      this.presentToast(`Connected to device ${deviceName}`);
      this.bleServices = await BleClient.getServices(device.deviceId);
    } catch (error) {
      console.error('connectToBluetoothDevice', error);
      this.presentToast(JSON.stringify(error));
    }
  }

  async disconnectFromBluetoothDevice() {
    if (!this.bluetoothConnectedDevice) {
      return;
    }

    const device = this.bluetoothConnectedDevice.device;

    try {
      await BleClient.disconnect(device.deviceId);
      this.bluetoothConnectedDevice = undefined;
      const deviceName = device.name ?? device.deviceId;
      this.presentToast(`Disconnected from device ${deviceName}`);
    } catch (error) {
      console.error('disconnectFromBluetoothDevice', error);
      this.presentToast(JSON.stringify(error));
    }
  }

  async readFromBluetoothDevice() {
    if (!this.bluetoothConnectedDevice) {
      // await this.presentToast('Bluetooth device not connected');
      return;
    }
  
    try {
      const device = this.bluetoothConnectedDevice.device;
      if (this.bleServices.length === 0) {
        await this.presentToast('No services available');
        return;
      }
  
      // 读取数据
      const dataView = await BleClient.read(
        device.deviceId,
        this.pillowServiceUUID,
        this.pillowCharacteristicsUUID
      );

      // 处理数据
      this.receivedData = dataViewToText(dataView); // 将 DataView 转换为文本
      this.fileService.receivedData = this.receivedData;
      // this.presentToast(`Received Data: ${this.receivedData}`);
    } catch (error) {
      console.error('Error reading from Bluetooth device:', error);
      await this.presentToast(`Error: ${JSON.stringify(error)}`);
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1700,
    });
    toast.present();
  }

  onBluetoothDeviceDisconnected(deviceId: string) {
    const disconnectedDevice = this.bluetoothScanResults.find(result => result.device.deviceId === deviceId);
    if (disconnectedDevice) {
      this.presentToast(`Disconnected from ${disconnectedDevice.device.name ?? disconnectedDevice.device.deviceId}`);
      this.bluetoothConnectedDevice = undefined;
    }
  }

}
