import * as ImagePicker from "expo-image-picker";

type PickImagesFromLibraryOptions = {
  selectionLimit?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
};

export type PickImagesSuccessResult = {
  status: "success";
  assets: ImagePicker.ImagePickerAsset[];
};

export type PickImagesFailureResult = {
  status: "cancelled" | "permission-denied";
};

export type PickImagesResult = PickImagesSuccessResult | PickImagesFailureResult;

export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export class NativeImagePicker {
  static async pickImagesFromLibrary(
    options: PickImagesFromLibraryOptions = {},
  ): Promise<PickImagesResult> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { status: "permission-denied" };
    }

    const { selectionLimit = 1, allowsEditing = false, aspect, quality = 0.8 } = options;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: selectionLimit === 1 ? allowsEditing : false,
      aspect,
      quality,
      selectionLimit,
    });

    if (result.canceled || !result.assets[0]) {
      return { status: "cancelled" };
    }

    return {
      status: "success",
      assets: result.assets,
    };
  }

  static createUploadFileFromAsset(asset: ImagePicker.ImagePickerAsset): NativeUploadFile {
    return {
      uri: asset.uri,
      name: asset.fileName || asset.uri.split("/").at(-1) || `upload-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
    };
  }
}
