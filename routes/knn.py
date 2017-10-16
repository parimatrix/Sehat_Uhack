# K-Nearest Neighbors (K-NN)

# Importing the libraries
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
import sys, json
import os
import warnings

warnings.filterwarnings('ignore')

# Importing thate dataset
dataset = pd.read_csv(os.getcwd() + '/routes/sample.csv')
X = dataset.iloc[:, 0:2].values
y = dataset.iloc[:, 2].values
lines = sys.stdin.readlines()

# Since our input would only be having one line, parse our JSON data from that
lines = json.loads(lines[0])
row = [lines[0],lines[1]]
X = np.vstack([X,row])

# Feature Scaling
from sklearn.preprocessing import StandardScaler
sc = StandardScaler()
X = sc.fit_transform(X)

# Splitting the dataset into the Training set and Test set
X_train = X[:-1]
y_train = y
X_test = X[-1:]

# Fitting K-NN to the Training set
from sklearn.neighbors import KNeighborsClassifier
classifier = KNeighborsClassifier(n_neighbors = 5, metric = 'minkowski', p = 2)
classifier.fit(X_train, y_train)

# Predicting the Test set results
y_pred = classifier.predict(X_train)
print(classifier.predict(X_test)[0])

# Making the Confusion Matrix
# from sklearn.metrics import confusion_matrix
# cm = confusion_matrix(y_train, y_pred)

# # Visualising the Training set results
# from matplotlib.colors import ListedColormap
# X_set, y_set = X_train, y_train
# X1, X2 = np.meshgrid(np.arange(start = X_set[:, 0].min() - 1, stop = X_set[:, 0].max() + 1, step = 0.01),
#                      np.arange(start = X_set[:, 1].min() - 1, stop = X_set[:, 1].max() + 1, step = 0.01))
# plt.contourf(X1, X2, classifier.predict(np.array([X1.ravel(), X2.ravel()]).T).reshape(X1.shape),
#              alpha = 0.75, cmap = ListedColormap(('red', 'green', 'blue', 'yellow')))
# plt.xlim(X1.min(), X1.max())
# plt.ylim(X2.min(), X2.max())    
# for i, j in enumerate(np.unique(y_set)):
#     plt.scatter(X_set[y_set == j, 0], X_set[y_set == j, 1],
#                 c = ListedColormap(('red', 'green', 'blue', 'yellow'))(i), label = j)
# plt.title('K-NN (Training set)')
# plt.xlabel('Day')
# plt.ylabel('Deviation')
# plt.legend()
# plt.show()
