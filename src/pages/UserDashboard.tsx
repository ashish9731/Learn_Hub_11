const loadLearningMetrics = async (userId: string) => {
    try {
      // Use the helper function to calculate metrics
      const metrics = await supabaseHelpers.calculateUserLearningMetrics(userId);
      setLearningMetrics(metrics);
    } catch (error) {
      console.error('Error loading learning metrics:', error);
      // Set default metrics if loading fails
      setLearningMetrics({
        totalHours: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        averageCompletion: 0
      });
    }
  };