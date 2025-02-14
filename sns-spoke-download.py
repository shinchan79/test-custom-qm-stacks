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
    
    # Define SNS Spoke assets to download with their new names
    files = {
        "assete8b91b89616aa81e100a9f9ce53981ad5df4ba7439cebca83d5dc68349ed3703.zip": "sns-spoke/utils-layer.zip",
        "assete7a324e67e467d0c22e13b0693ca4efdceb0d53025c7fb45fe524870a5c18046.zip": "sns-spoke/sns-publisher.zip"
    }

    # Download each file
    for original_name, new_name in files.items():
        url = f"{base_url}/{original_name}"
        download_file(url, new_name)

if __name__ == "__main__":
    main()