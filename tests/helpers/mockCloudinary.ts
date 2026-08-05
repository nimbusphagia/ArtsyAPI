export function makeUploadStreamImpl() {
  let uploadCallCount = 0;
  return (_options: any, callback: any) => {
    const callIndex = uploadCallCount++;
    return {
      end: () => {
        callback(undefined, {
          public_id: `fake_public_id_${callIndex}`,
          asset_id: `fake_asset_id_${callIndex}`,
          resource_type: "image",
          format: "jpg",
          secure_url: `https://example.com/fake_${callIndex}.jpg`,
          width: 500,
          height: 500,
          bytes: 12345,
        });
      },
    };
  };
}

export function makeUploadLargeStreamImpl() {
  let uploadCallCount = 0;
  return (_options: any, callback: any) => {
    const callIndex = uploadCallCount++;
    return {
      end: () => {
        callback(undefined, {
          public_id: `fake_video_id_${callIndex}`,
          asset_id: `fake_video_asset_${callIndex}`,
          resource_type: "video",
          format: "mp4",
          secure_url: `https://example.com/fake_video_${callIndex}.mp4`,
          eager: [
            { secure_url: `https://example.com/fake_thumb_${callIndex}.jpg` },
          ],
          duration: 12.5,
          bytes: 999999,
        });
      },
    };
  };
}
