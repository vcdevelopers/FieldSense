class SafeStorage {
  private memoryStorage = new Map<string, string>();
  private type: 'sessionStorage' | 'localStorage';

  constructor(type: 'sessionStorage' | 'localStorage') {
    this.type = type;
  }

  private isStorageAvailable(): boolean {
    try {
      const storage = window[this.type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isStorageAvailable()) {
      return window[this.type].getItem(key);
    }
    return this.memoryStorage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.isStorageAvailable()) {
      window[this.type].setItem(key, value);
    } else {
      this.memoryStorage.set(key, value);
    }
  }

  removeItem(key: string): void {
    if (this.isStorageAvailable()) {
      window[this.type].removeItem(key);
    } else {
      this.memoryStorage.delete(key);
    }
  }
  
  clear(): void {
    if (this.isStorageAvailable()) {
      window[this.type].clear();
    } else {
      this.memoryStorage.clear();
    }
  }
}

export const safeSessionStorage = new SafeStorage('sessionStorage');
export const safeLocalStorage = new SafeStorage('localStorage');
