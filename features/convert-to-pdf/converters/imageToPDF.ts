import * as FileSystem from 'expo-file-system';

export const imageToHTML = async (imageUri: string): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
  const mimeType = imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: white; }
          img { max-width: 100%; max-height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <img src="data:${mimeType};base64,${base64}" />
      </body>
    </html>
  `;
};
