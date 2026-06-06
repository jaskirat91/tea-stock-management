import { ipcMain } from 'electron';
import { AppDataSource } from '../../infrastructure/database/dataSource';
import { AppSetting } from '../../domain/entities/AppSetting';

export function setupIpcHandlers() {
  ipcMain.handle('app:get-settings', async () => {
    const repository = AppDataSource.getRepository(AppSetting);
    return await repository.find();
  });

  ipcMain.handle('app:get-setting', async (_, key: string) => {
    const repository = AppDataSource.getRepository(AppSetting);
    return await repository.findOneBy({ key });
  });

  ipcMain.handle('app:save-setting', async (_, key: string, value: string) => {
    const repository = AppDataSource.getRepository(AppSetting);
    let setting = await repository.findOneBy({ key });
    
    if (setting) {
      setting.value = value;
    } else {
      setting = repository.create({ key, value });
    }
    
    return await repository.save(setting);
  });
}
