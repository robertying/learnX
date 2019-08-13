export const getLatestRelease = async () => {
  const response = await fetch(
    'https://api.github.com/repos/robertying/learnX/releases/latest',
  );
  const json = await response.json();

  const versionString = json.tag_name as string;
  const apkUrl = `https://github.com/robertying/learnX/releases/download/${versionString}/learnX-universal-${versionString}.apk`;

  return {
    versionString,
    apkUrl,
  };
};
