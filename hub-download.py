import requests
import os

def download_file(url, filename):
    """Download a file from URL and save it with given filename"""
    print(f"Downloading {filename}...")
    response = requests.get(url)
    if response.status_code == 200:
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'wb') as f:
            f.write(response.content)
        print(f"Successfully downloaded {filename}")
    else:
        print(f"Failed to download {filename}: HTTP {response.status_code}")

def main():
    base_url = "https://solutions-ap-southeast-1.s3.ap-southeast-1.amazonaws.com/quota-monitor-for-aws/v6.3.0"
    
    # Define Lambda assets to download with their new names
    files = {
        "assete8b91b89616aa81e100a9f9ce53981ad5df4ba7439cebca83d5dc68349ed3703.zip": "lambda/utils-layer.zip",
        "assetf4ee0c3d949f011b3f0f60d231fdacecab71c5f3ccf9674352231cedf831f6cd.zip": "lambda/helper-function.zip",
        "asset7382a0addb9f34974a1ea6c6c9b063882af874828f366f5c93b2b7b64db15c94.zip": "lambda/framework-onEvent.zip",
        "asset11434a0b3246f0b4445dd28fdbc9e4e7dc808ccf355077acd9b000c5d88e6713.zip": "lambda/slack-notifier.zip",
        "assete7a324e67e467d0c22e13b0693ca4efdceb0d53025c7fb45fe524870a5c18046.zip": "lambda/sns-publisher.zip",
        "asseta6fda81c73d731886f04e1734d036f12ceb7b94c2efec30bb511f477ac58aa9c.zip": "lambda/reporter.zip",
        "asset6a1cf55956fc481a1f22a54b0fa78a3d78b7e61cd41e12bf80ac8c9404ff9eb2.zip": "lambda/deployment-manager.zip"
    }

    # Download each file
    for original_name, new_name in files.items():
        url = f"{base_url}/{original_name}"
        download_file(url, new_name)

if __name__ == "__main__":
    main()