import Share from "react-native-share";
import RNFetchBlob from "rn-fetch-blob";

export const supportedFileTypes: ReadonlyArray<string> = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "zip",
  "rar"
];
export const mimeTypes: any = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  rar: "application/x-rar-compressed"
};

export const shareFile = (url: string, ext: string) => {
  return new Promise<boolean>(async (resolve, reject) => {
    if (!supportedFileTypes.includes(ext.toLowerCase())) {
      reject("Unsupported file type");
    }

    const res = await RNFetchBlob.fetch("GET", url);
    const status = res.respInfo.status;

    if (status !== 200) {
      reject();
    } else {
      const base64Str = res.base64();
      Share.open({
        url: `data:${mimeTypes[ext]};base64,${base64Str}`,
        type: mimeTypes[ext],
        title: "打开文件",
        showAppsToView: true
      });
      resolve(true);
    }
  });
};

export const getExtension = (filename: string) => {
  return filename.split(".").pop();
};
